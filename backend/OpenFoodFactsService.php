<?php
declare(strict_types=1);

final class OpenFoodFactsService
{
    public const USER_AGENT = 'KaloriKu/1.0 (Local Diet Monitoring App)';

    /**
     * @param ?callable(string): array{ok:bool, status:int, body:string, error:string} $fetcher
     * @return array<int, array<string, mixed>>
     */
    public static function searchProducts(string $query, ?callable $fetcher = null): array
    {
        $q = trim($query);
        if (mb_strlen($q) < 2) {
            throw new InvalidArgumentException('Masukkan minimal 2 huruf nama produk untuk mencari di Open Food Facts.');
        }

        $params = http_build_query([
            'q' => $q,
            'page_size' => '24',
            'fields' => 'code,product_name,product_name_id,product_name_en,brands,quantity,serving_size,serving_quantity,nutriments,image_front_small_url',
        ]);
        $url = 'https://search.openfoodfacts.org/search?' . $params;

        $httpGet = $fetcher ?? [self::class, 'curlGet'];
        $res = $httpGet($url);

        if (empty($res['ok']) || (int) ($res['status'] ?? 0) >= 400) {
            $status = (int) ($res['status'] ?? 0);
            $detail = trim((string) ($res['error'] ?? ''));
            $suffix = $detail !== '' ? " ({$detail})" : ($status > 0 ? " (HTTP {$status})" : '');
            throw new RuntimeException(
                'Gagal menghubungi Open Food Facts. Cek koneksi internet atau coba lagi sebentar.' . $suffix
            );
        }

        $decoded = json_decode((string) ($res['body'] ?? ''), true);
        if (!is_array($decoded)) {
            return [];
        }
        $rawList = $decoded['hits'] ?? $decoded['products'] ?? null;
        if (!is_array($rawList)) {
            return [];
        }

        return self::normalizeProducts($rawList);
    }

    /**
     * @param array<int, array<string, mixed>> $rawProducts
     * @return array<int, array<string, mixed>>
     */
    public static function normalizeProducts(array $rawProducts): array
    {
        $results = [];
        $seen = [];

        foreach ($rawProducts as $p) {
            if (!is_array($p)) {
                continue;
            }
            $baseName = trim((string) ($p['product_name_id'] ?? ''));
            if ($baseName === '') {
                $baseName = trim((string) ($p['product_name'] ?? ''));
            }
            if ($baseName === '') {
                $baseName = trim((string) ($p['product_name_en'] ?? ''));
            }
            if ($baseName === '') {
                continue;
            }

            $nutriments = is_array($p['nutriments'] ?? null) ? $p['nutriments'] : [];
            $cal100 = self::extractCaloriesPer100g($nutriments);
            if ($cal100 === null || $cal100 < 0) {
                continue;
            }

            $primaryBrand = self::extractBrand($p['brands'] ?? null);
            $displayName = $baseName;
            if ($primaryBrand !== '' && stripos($baseName, $primaryBrand) === false) {
                $displayName = "{$baseName} ({$primaryBrand})";
            }

            $servingSizeRaw = trim((string) ($p['serving_size'] ?? ''));
            $quantityRaw = trim((string) ($p['quantity'] ?? ''));
            $servingGrams = self::extractServingGrams($p['serving_quantity'] ?? null, $servingSizeRaw, $quantityRaw);
            $defaultUnit = self::detectUnit($servingSizeRaw !== '' ? $servingSizeRaw : $quantityRaw);

            $protein = self::extractMacro($nutriments, 'proteins_100g');
            $carbs = self::extractMacro($nutriments, 'carbohydrates_100g');
            $fat = self::extractMacro($nutriments, 'fat_100g');

            $dedupKey = strtolower($displayName) . '|' . round($cal100);
            if (isset($seen[$dedupKey])) {
                continue;
            }
            $seen[$dedupKey] = true;

            $results[] = [
                'code' => (string) ($p['code'] ?? ''),
                'name' => $displayName,
                'brand' => $primaryBrand,
                'image_url' => !empty($p['image_front_small_url']) ? (string) $p['image_front_small_url'] : null,
                'serving_size' => $servingSizeRaw !== '' ? $servingSizeRaw : ($quantityRaw !== '' ? $quantityRaw : "{$servingGrams} g"),
                'default_unit' => $defaultUnit,
                'serving_grams' => round($servingGrams, 1),
                'calories_per_100g' => round($cal100, 1),
                'protein_per_100g' => round($protein, 1),
                'carbs_per_100g' => round($carbs, 1),
                'fat_per_100g' => round($fat, 1),
                'calories_per_serving' => (int) round(($servingGrams / 100.0) * $cal100),
            ];

            if (count($results) >= 12) {
                break;
            }
        }

        return $results;
    }

    private static function extractBrand(mixed $brands): string
    {
        if (is_array($brands)) {
            foreach ($brands as $b) {
                $t = trim((string) $b);
                if ($t !== '') {
                    return $t;
                }
            }
            return '';
        }
        $str = trim((string) ($brands ?? ''));
        return $str !== '' ? trim(explode(',', $str)[0]) : '';
    }

    /**
     * @param array<string, mixed> $nutriments
     */
    private static function extractCaloriesPer100g(array $nutriments): ?float
    {
        foreach (['energy-kcal_100g', 'energy-kcal_value', 'energy-kcal'] as $key) {
            if (isset($nutriments[$key]) && is_numeric($nutriments[$key])) {
                return (float) $nutriments[$key];
            }
        }
        if (isset($nutriments['energy_100g']) && is_numeric($nutriments['energy_100g'])) {
            $kj = (float) $nutriments['energy_100g'];
            if ($kj >= 0) {
                return $kj / 4.184;
            }
        }
        return null;
    }

    /**
     * @param array<string, mixed> $nutriments
     */
    private static function extractMacro(array $nutriments, string $key): float
    {
        if (isset($nutriments[$key]) && is_numeric($nutriments[$key])) {
            return max(0.0, (float) $nutriments[$key]);
        }
        return 0.0;
    }

    private static function extractServingGrams(mixed $servingQuantity, string $servingSizeRaw, string $quantityRaw = ''): float
    {
        if ($servingQuantity !== null && $servingQuantity !== '') {
            $num = (float) str_replace(',', '.', (string) $servingQuantity);
            if ($num > 0 && $num <= 2000) {
                return $num;
            }
        }
        if ($servingSizeRaw !== '' && preg_match('/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|ml)\b/i', $servingSizeRaw, $m)) {
            $num = (float) str_replace(',', '.', $m[1]);
            if ($num > 0 && $num <= 2000) {
                return $num;
            }
        }
        if ($quantityRaw !== '' && preg_match('/(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|ml)\b/i', $quantityRaw, $m)) {
            $num = (float) str_replace(',', '.', $m[1]);
            if ($num > 0 && $num <= 500) {
                return $num;
            }
        }
        return 100.0;
    }

    private static function detectUnit(string $servingSizeRaw): string
    {
        $lower = strtolower($servingSizeRaw);
        if (str_contains($lower, 'bungkus') || str_contains($lower, 'pack') || str_contains($lower, 'sachet')) {
            return 'bungkus';
        }
        if (str_contains($lower, 'botol') || str_contains($lower, 'bottle')) {
            return 'botol';
        }
        if (str_contains($lower, 'kaleng') || str_contains($lower, 'can')) {
            return 'kaleng';
        }
        if (str_contains($lower, 'gelas') || str_contains($lower, 'ml') || str_contains($lower, 'cup')) {
            return 'gelas';
        }
        if (str_contains($lower, 'potong') || str_contains($lower, 'slice') || str_contains($lower, 'bar') || str_contains($lower, 'keping')) {
            return 'potong';
        }
        return 'porsi';
    }

    /**
     * @return array{ok:bool, status:int, body:string, error:string}
     */
    private static function curlGet(string $url): array
    {
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'Ekstensi PHP cURL tidak aktif'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_USERAGENT => self::USER_AGENT,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $err = curl_error($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || $body === false) {
            return ['ok' => false, 'status' => $status, 'body' => '', 'error' => $err];
        }
        return ['ok' => true, 'status' => $status, 'body' => (string) $body, 'error' => ''];
    }
}
