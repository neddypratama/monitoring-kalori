<?php
declare(strict_types=1);

final class GeminiFoodService
{
    public const DEFAULT_MODEL = 'gemini-2.5-flash';
    public const ALLOWED_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
    public const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    public const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

    public static function getApiKey(PDO $pdo): string
    {
        $stmt = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'gemini_api_key' LIMIT 1");
        $stmt->execute();
        $val = trim((string) ($stmt->fetchColumn() ?: ''));
        if ($val !== '') {
            return $val;
        }
        $env = getenv('GEMINI_API_KEY');
        return is_string($env) ? trim($env) : '';
    }

    public static function getModel(PDO $pdo): string
    {
        $stmt = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'gemini_model' LIMIT 1");
        $stmt->execute();
        $val = trim((string) ($stmt->fetchColumn() ?: ''));
        return in_array($val, self::ALLOWED_MODELS, true) ? $val : self::DEFAULT_MODEL;
    }

    public static function maskKey(string $key): string
    {
        $len = strlen($key);
        if ($len === 0) {
            return '';
        }
        if ($len <= 8) {
            return str_repeat('*', $len);
        }
        return substr($key, 0, 4) . str_repeat('*', max(4, $len - 8)) . substr($key, -4);
    }

    /**
     * @param ?callable(string, array<string, mixed>): array{ok:bool, status:int, body:string, error:string} $poster
     * @return array<string, mixed>
     */
    public static function analyzeFoodPhoto(
        string $apiKey,
        string $model,
        string $imageBase64,
        string $mimeType,
        string $userHint = '',
        ?callable $poster = null
    ): array {
        $key = trim($apiKey);
        if ($key === '') {
            throw new InvalidArgumentException(
                'API Key Google Gemini belum diatur. Minta Admin mengisi API Key gratis dari aistudio.google.com/apikey di menu Panel Admin → Pengaturan AI.'
            );
        }

        $mime = strtolower(trim($mimeType));
        if ($mime === 'image/jpg') {
            $mime = 'image/jpeg';
        }
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new InvalidArgumentException('Format gambar harus JPG, PNG, atau WebP.');
        }

        // Strip data URI prefix if present
        $cleanBase64 = trim($imageBase64);
        if (str_contains($cleanBase64, ',')) {
            $parts = explode(',', $cleanBase64, 2);
            $cleanBase64 = trim($parts[1]);
        }
        if ($cleanBase64 === '') {
            throw new InvalidArgumentException('File foto makanan kosong.');
        }
        $decodedBytes = base64_decode($cleanBase64, true);
        if ($decodedBytes === false || strlen($decodedBytes) === 0) {
            throw new InvalidArgumentException('Data foto base64 tidak valid.');
        }
        if (strlen($decodedBytes) > self::MAX_IMAGE_BYTES) {
            throw new InvalidArgumentException('Ukuran foto terlalu besar (maksimal 5 MB).');
        }

        $safeModel = in_array($model, self::ALLOWED_MODELS, true) ? $model : self::DEFAULT_MODEL;
        $hintLine = trim($userHint) !== ''
            ? "\nCatatan tambahan dari pengguna: \"" . trim($userHint) . "\" (jadikan acuan porsi/komposisi)."
            : '';

        $prompt = <<<PROMPT
Kamu adalah ahli gizi Indonesia yang teliti. Analisis foto makanan/minuman ini dan perkirakan setiap item makanan atau minuman yang terlihat secara realistis menggunakan standar gizi Indonesia (TKPI/USDA).{$hintLine}

Balas HANYA dalam format JSON valid (tanpa teks tambahan di luar JSON) dengan struktur persis seperti ini:
{
  "meal_summary": "Ringkasan singkat hidangan dalam Bahasa Indonesia",
  "confidence": "tinggi | sedang | rendah",
  "notes": "Catatan singkat asumsi porsi (Bahasa Indonesia)",
  "items": [
    {
      "name": "Nama makanan/minuman (Bahasa Indonesia)",
      "unit": "piring | potong | porsi | mangkok | gelas | butir | buah | bungkus",
      "quantity": 1,
      "estimated_grams": 150,
      "calories": 195,
      "protein": 4.1,
      "carbs": 42.0,
      "fat": 0.5
    }
  ]
}

Jika di foto tidak terlihat makanan atau minuman sama sekali, kembalikan "items": [] dan jelaskan pada "notes".
PROMPT;

        $payload = [
            'contents' => [[
                'parts' => [
                    ['text' => $prompt],
                    [
                        'inline_data' => [
                            'mime_type' => $mime,
                            'data' => $cleanBase64,
                        ],
                    ],
                ],
            ]],
            'generationConfig' => [
                'temperature' => 0.2,
                'responseMimeType' => 'application/json',
            ],
        ];

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$safeModel}:generateContent?key=" . rawurlencode($key);
        $httpPost = $poster ?? [self::class, 'curlPostJson'];
        $res = $httpPost($url, $payload);

        if (empty($res['ok']) || (int) ($res['status'] ?? 0) >= 400) {
            $status = (int) ($res['status'] ?? 0);
            $errJson = json_decode((string) ($res['body'] ?? ''), true);
            $apiMsg = is_array($errJson) ? (string) ($errJson['error']['message'] ?? '') : '';
            if ($status === 400 || $status === 401 || $status === 403) {
                throw new RuntimeException('API Key Gemini tidak valid atau ditolak. Periksa API Key di Panel Admin → Pengaturan AI.' . ($apiMsg !== '' ? " ({$apiMsg})" : ''));
            }
            if ($status === 429) {
                throw new RuntimeException('Kuota permintaan Gemini API sedang penuh. Tunggu sebentar lalu coba lagi.');
            }
            $detail = trim((string) ($res['error'] ?? '')) ?: $apiMsg;
            throw new RuntimeException('Gagal menganalisis foto lewat Gemini AI.' . ($detail !== '' ? " ({$detail})" : ''));
        }

        $body = json_decode((string) ($res['body'] ?? ''), true);
        $rawText = (string) ($body['candidates'][0]['content']['parts'][0]['text'] ?? '');
        $parsed = self::extractJson($rawText);
        if (!is_array($parsed)) {
            throw new RuntimeException('Respons AI tidak dapat dibaca. Coba ambil foto makanan yang lebih jelas.');
        }

        return self::normalizeResponse($parsed);
    }

    /**
     * @return ?array<string, mixed>
     */
    private static function extractJson(string $text): ?array
    {
        $clean = trim($text);
        if ($clean === '') {
            return null;
        }
        // Strip markdown ```json ... ``` fences if present
        if (preg_match('/```(?:json)?\s*(\{.*\})\s*```/s', $clean, $m)) {
            $clean = $m[1];
        } elseif (!str_starts_with($clean, '{') && preg_match('/(\{.*\})/s', $clean, $m)) {
            $clean = $m[1];
        }
        $decoded = json_decode($clean, true);
        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param array<string, mixed> $parsed
     * @return array<string, mixed>
     */
    private static function normalizeResponse(array $parsed): array
    {
        $rawItems = is_array($parsed['items'] ?? null) ? $parsed['items'] : [];
        $items = [];
        $totalCal = 0;
        $totalPro = 0.0;
        $totalCarb = 0.0;
        $totalFat = 0.0;

        foreach ($rawItems as $it) {
            if (!is_array($it)) {
                continue;
            }
            $name = trim((string) ($it['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $qty = max(0.1, round((float) ($it['quantity'] ?? 1), 2));
            $grams = max(1.0, round((float) ($it['estimated_grams'] ?? 100), 1));
            $cal = max(0, (int) round((float) ($it['calories'] ?? 0)));
            $pro = max(0.0, round((float) ($it['protein'] ?? 0), 1));
            $carb = max(0.0, round((float) ($it['carbs'] ?? 0), 1));
            $fat = max(0.0, round((float) ($it['fat'] ?? 0), 1));
            $unit = trim((string) ($it['unit'] ?? 'porsi'));
            if ($unit === '') {
                $unit = 'porsi';
            }

            $totalCal += $cal;
            $totalPro += $pro;
            $totalCarb += $carb;
            $totalFat += $fat;

            $items[] = [
                'name' => $name,
                'unit' => $unit,
                'quantity' => $qty,
                'estimated_grams' => $grams,
                'calories' => $cal,
                'protein' => $pro,
                'carbs' => $carb,
                'fat' => $fat,
            ];
        }

        $confidence = strtolower(trim((string) ($parsed['confidence'] ?? 'sedang')));
        if (!in_array($confidence, ['tinggi', 'sedang', 'rendah'], true)) {
            $confidence = 'sedang';
        }

        return [
            'meal_summary' => trim((string) ($parsed['meal_summary'] ?? 'Hasil Analisis Foto')),
            'confidence' => $confidence,
            'notes' => trim((string) ($parsed['notes'] ?? '')),
            'total_calories' => $totalCal,
            'total_protein' => round($totalPro, 1),
            'total_carbs' => round($totalCarb, 1),
            'total_fat' => round($totalFat, 1),
            'items' => $items,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok:bool, status:int, body:string, error:string}
     */
    private static function curlPostJson(string $url, array $payload): array
    {
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'Ekstensi PHP cURL tidak aktif'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 30,
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
