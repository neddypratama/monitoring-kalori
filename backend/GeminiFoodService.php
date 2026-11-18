<?php
declare(strict_types=1);

final class GeminiFoodService
{
    public const DEFAULT_MODEL = 'gemini-3.8-flash';
    public const ALLOWED_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

    public const PROVIDERS = ['gemini', 'groq', 'openrouter', 'openai'];

    /** @var array<string, list<string>> */
    public const PROVIDER_MODELS = [
        'gemini' => ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'],
        'groq' => [
            'meta-llama/llama-4-scout-17b-16e-instruct',
            'meta-llama/llama-4-maverick-17b-128e-instruct',
        ],
        'openrouter' => [
            'openrouter/free',
            'google/gemini-2.5-flash',
            'meta-llama/llama-4-scout:free',
            'qwen/qwen2.5-vl-72b-instruct:free',
        ],
        'openai' => ['gpt-4.1-mini', 'gpt-4o-mini', 'gpt-4.1-nano'],
    ];

    /** @var array<string, string> */
    public const PROVIDER_LABELS = [
        'gemini' => 'Google Gemini',
        'groq' => 'Groq Vision',
        'openrouter' => 'OpenRouter',
        'openai' => 'OpenAI',
    ];

    public const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    public const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

    public static function getSetting(PDO $pdo, string $key): string
    {
        $stmt = $pdo->prepare('SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1');
        $stmt->execute([$key]);
        return trim((string) ($stmt->fetchColumn() ?: ''));
    }

    public static function getProviderApiKey(PDO $pdo, string $provider): string
    {
        $val = self::getSetting($pdo, "{$provider}_api_key");
        if ($val !== '') {
            return $val;
        }
        $envName = strtoupper($provider) . '_API_KEY';
        $env = getenv($envName);
        return is_string($env) ? trim($env) : '';
    }

    public static function getProviderModel(PDO $pdo, string $provider): string
    {
        $allowed = self::PROVIDER_MODELS[$provider] ?? [];
        $default = $allowed[0] ?? self::DEFAULT_MODEL;
        $val = self::getSetting($pdo, "{$provider}_model");
        if ($val === '') {
            return $default;
        }
        if ($provider === 'openrouter' && self::isValidModelSlug($val)) {
            return $val;
        }
        return in_array($val, $allowed, true) ? $val : $default;
    }

    public static function isValidModelSlug(string $model): bool
    {
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]{2,100}$/', $model);
    }

    public static function getApiKey(PDO $pdo): string
    {
        return self::getProviderApiKey($pdo, 'gemini');
    }

    public static function getModel(PDO $pdo): string
    {
        return self::getProviderModel($pdo, 'gemini');
    }

    public static function getPrimaryProvider(PDO $pdo): string
    {
        $val = strtolower(self::getSetting($pdo, 'ai_primary_provider'));
        return in_array($val, self::PROVIDERS, true) ? $val : 'gemini';
    }

    public static function getAutoFallback(PDO $pdo): bool
    {
        $val = self::getSetting($pdo, 'ai_auto_fallback');
        return $val === '' ? true : ($val === '1' || strtolower($val) === 'true');
    }

    /**
     * Returns safe (masked) settings payload for Admin UI.
     *
     * @return array<string, mixed>
     */
    public static function getPublicSettings(PDO $pdo): array
    {
        $providers = [];
        foreach (self::PROVIDERS as $p) {
            $key = self::getProviderApiKey($pdo, $p);
            $providers[$p] = [
                'has_key' => $key !== '',
                'key_masked' => self::maskKey($key),
                'model' => self::getProviderModel($pdo, $p),
                'allowed_models' => self::PROVIDER_MODELS[$p],
            ];
        }

        return [
            // Backward-compatible top-level Gemini fields
            'has_gemini_key' => $providers['gemini']['has_key'],
            'gemini_key_masked' => $providers['gemini']['key_masked'],
            'gemini_model' => $providers['gemini']['model'],
            'allowed_models' => self::ALLOWED_MODELS,
            // Multi-provider fields
            'primary_provider' => self::getPrimaryProvider($pdo),
            'auto_fallback' => self::getAutoFallback($pdo),
            'providers' => $providers,
        ];
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
     * High-level entry point reading all configured providers from SQLite and running auto-fallback.
     *
     * @param ?callable(string, array<string, mixed>, array<int, string>): array{ok:bool, status:int, body:string, error:string} $poster
     * @return array<string, mixed>
     */
    public static function analyzeFoodPhotoFromDb(
        PDO $pdo,
        string $imageBase64,
        string $mimeType,
        string $userHint = '',
        ?callable $poster = null
    ): array {
        $providerConfigs = [];
        foreach (self::PROVIDERS as $p) {
            $providerConfigs[$p] = [
                'api_key' => self::getProviderApiKey($pdo, $p),
                'model' => self::getProviderModel($pdo, $p),
            ];
        }

        return self::analyzeWithProviders(
            $providerConfigs,
            self::getPrimaryProvider($pdo),
            self::getAutoFallback($pdo),
            $imageBase64,
            $mimeType,
            $userHint,
            $poster
        );
    }

    /**
     * Backward-compatible single-provider Gemini entry point (with intra-Gemini model fallback).
     *
     * @param ?callable(string, array<string, mixed>, array<int, string>): array{ok:bool, status:int, body:string, error:string} $poster
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
        $safeModel = in_array($model, self::ALLOWED_MODELS, true) ? $model : self::DEFAULT_MODEL;
        return self::analyzeWithProviders(
            [
                'gemini' => ['api_key' => trim($apiKey), 'model' => $safeModel],
            ],
            'gemini',
            true,
            $imageBase64,
            $mimeType,
            $userHint,
            $poster
        );
    }

    /**
     * Multi-provider Vision AI orchestrator with automatic intra-provider & cross-provider fallback.
     *
     * @param array<string, array{api_key?:string, model?:string}> $providerConfigs
     * @param ?callable(string, array<string, mixed>, array<int, string>): array{ok:bool, status:int, body:string, error:string} $poster
     * @return array<string, mixed>
     */
    public static function analyzeWithProviders(
        array $providerConfigs,
        string $primaryProvider,
        bool $autoFallback,
        string $imageBase64,
        string $mimeType,
        string $userHint = '',
        ?callable $poster = null
    ): array {
        // Validate image upfront before checking providers or sending network requests
        [$cleanBase64, $mime] = self::validateAndNormalizeImage($imageBase64, $mimeType);

        // Build ordered list of configured providers (primary first, then others if autoFallback)
        $orderedProviders = [];
        $primary = in_array($primaryProvider, self::PROVIDERS, true) ? $primaryProvider : 'gemini';
        $priorityOrder = array_values(array_unique([$primary, 'groq', 'gemini', 'openrouter', 'openai']));

        foreach ($priorityOrder as $p) {
            $cfg = $providerConfigs[$p] ?? null;
            $key = is_array($cfg) ? trim((string) ($cfg['api_key'] ?? '')) : '';
            if ($key === '') {
                continue;
            }
            $orderedProviders[] = [
                'provider' => $p,
                'api_key' => $key,
                'model' => trim((string) ($cfg['model'] ?? '')) ?: (self::PROVIDER_MODELS[$p][0] ?? self::DEFAULT_MODEL),
            ];
            if (!$autoFallback && $p === $primary) {
                break;
            }
        }

        if (count($orderedProviders) === 0) {
            throw new InvalidArgumentException(
                'Belum ada API Key AI yang diatur. Minta Admin mengisi API Key gratis (Groq atau Google Gemini) di menu Panel Admin → Pengaturan AI.'
            );
        }

        $prompt = self::buildNutritionPrompt($userHint);
        $httpPost = $poster ?? [self::class, 'curlPostJson'];
        $errors = [];

        foreach ($orderedProviders as $pCfg) {
            $provider = $pCfg['provider'];
            $apiKey = $pCfg['api_key'];
            $chosenModel = $pCfg['model'];

            // Build model list for this provider (chosen model first, plus sibling fallback models if enabled)
            $modelsToTry = [$chosenModel];
            if ($autoFallback && isset(self::PROVIDER_MODELS[$provider])) {
                foreach (self::PROVIDER_MODELS[$provider] as $altModel) {
                    if (!in_array($altModel, $modelsToTry, true)) {
                        $modelsToTry[] = $altModel;
                    }
                }
            }

            foreach ($modelsToTry as $tryModel) {
                $attempt = $provider === 'gemini'
                    ? self::callGemini($apiKey, $tryModel, $prompt, $cleanBase64, $mime, $httpPost)
                    : self::callOpenAiCompatible($provider, $apiKey, $tryModel, $prompt, $cleanBase64, $mime, $httpPost);

                if ($attempt['ok'] && is_array($attempt['parsed'])) {
                    $normalized = self::normalizeResponse($attempt['parsed']);
                    $normalized['provider_used'] = $provider;
                    $normalized['model_used'] = $tryModel;
                    return $normalized;
                }

                $label = self::PROVIDER_LABELS[$provider] ?? $provider;
                $errors[] = "{$label} ({$tryModel}): {$attempt['error']}";

                // If auth failed (401/403 invalid key), don't waste time retrying sibling models on the same provider
                if (!empty($attempt['auth_error'])) {
                    break;
                }
                // If autoFallback is disabled, stop immediately
                if (!$autoFallback) {
                    break;
                }
            }

            if (!$autoFallback) {
                break;
            }
        }

        $summary = implode(' | ', array_slice($errors, 0, 3));
        throw new RuntimeException(
            'Gagal menganalisis foto makanan saat ini. ' . ($summary !== '' ? "({$summary})" : 'Coba lagi beberapa saat.')
        );
    }

    /**
     * @return array{0:string, 1:string}
     */
    private static function validateAndNormalizeImage(string $imageBase64, string $mimeType): array
    {
        $mime = strtolower(trim($mimeType));
        if ($mime === 'image/jpg') {
            $mime = 'image/jpeg';
        }
        if (!in_array($mime, self::ALLOWED_MIMES, true)) {
            throw new InvalidArgumentException('Format gambar harus JPG, PNG, atau WebP.');
        }

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

        return [$cleanBase64, $mime];
    }

    private static function buildNutritionPrompt(string $userHint): string
    {
        $hintLine = trim($userHint) !== ''
            ? "\nCatatan tambahan dari pengguna: \"" . trim($userHint) . "\" (jadikan acuan porsi/komposisi)."
            : '';

        return <<<PROMPT
Kamu adalah ahli gizi Indonesia yang teliti. Analisis foto makanan/minuman ini dan perkirakan setiap item makanan atau minuman yang terlihat secara realistis menggunakan standar gizi Indonesia (TKPI/USDA).{$hintLine}

Balas HANYA dalam format JSON valid (tanpa teks tambahan di luar JSON) dengan struktur persis seperti ini:
{
  "meal_summary": "Ringkasan singkat hidangan dalam Bahasa Indonesia",
  "confidence": "tinggi | sedang | rendah",
  "notes": "Catatan singkat asumsi porsi (Bahasa Indonesia)",
  "items": [
    {
      "name": "Nama makanan/minuman (Bahasa Indonesia)",
      "unit": "piring | potong | porsi | mangkok | gelas | butir | buah | bungkus | keping",
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
    }

    /**
     * @param callable $httpPost
     * @return array{ok:bool, parsed:?array<string, mixed>, error:string, auth_error:bool}
     */
    private static function callGemini(
        string $apiKey,
        string $model,
        string $prompt,
        string $cleanBase64,
        string $mime,
        callable $httpPost
    ): array {
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

        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . rawurlencode($apiKey);
        $res = $httpPost($url, $payload, []);

        if (empty($res['ok']) || (int) ($res['status'] ?? 0) >= 400) {
            $status = (int) ($res['status'] ?? 0);
            $errJson = json_decode((string) ($res['body'] ?? ''), true);
            $apiMsg = is_array($errJson) ? (string) ($errJson['error']['message'] ?? '') : '';
            $detail = trim((string) ($res['error'] ?? '')) ?: $apiMsg;
            $isAuth = $status === 401 || $status === 403 || stripos($detail, 'API key not valid') !== false;
            return [
                'ok' => false,
                'parsed' => null,
                'error' => $isAuth ? 'API Key tidak valid/ditolak' : ($detail !== '' ? $detail : "HTTP {$status}"),
                'auth_error' => $isAuth,
            ];
        }

        $body = json_decode((string) ($res['body'] ?? ''), true);
        $rawText = (string) ($body['candidates'][0]['content']['parts'][0]['text'] ?? '');
        $parsed = self::extractJson($rawText);
        if (!is_array($parsed)) {
            return [
                'ok' => false,
                'parsed' => null,
                'error' => 'Respons AI tidak dapat dibaca',
                'auth_error' => false,
            ];
        }

        return ['ok' => true, 'parsed' => $parsed, 'error' => '', 'auth_error' => false];
    }

    /**
     * Calls Groq, OpenRouter, or OpenAI chat/completions Vision endpoints.
     *
     * @param callable $httpPost
     * @return array{ok:bool, parsed:?array<string, mixed>, error:string, auth_error:bool}
     */
    private static function callOpenAiCompatible(
        string $provider,
        string $apiKey,
        string $model,
        string $prompt,
        string $cleanBase64,
        string $mime,
        callable $httpPost
    ): array {
        $endpoint = match ($provider) {
            'groq' => 'https://api.groq.com/openai/v1/chat/completions',
            'openrouter' => 'https://openrouter.ai/api/v1/chat/completions',
            default => 'https://api.openai.com/v1/chat/completions',
        };

        $headers = ["Authorization: Bearer {$apiKey}"];
        if ($provider === 'openrouter') {
            $headers[] = 'HTTP-Referer: https://kalori.bimapratama.com';
            $headers[] = 'X-Title: KaloriKu';
        }

        $dataUri = "data:{$mime};base64,{$cleanBase64}";
        $payload = [
            'model' => $model,
            'temperature' => 0.2,
            'max_tokens' => 1024,
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $prompt],
                    ['type' => 'image_url', 'image_url' => ['url' => $dataUri]],
                ],
            ]],
        ];

        // Groq & OpenAI support json_object reliably; OpenRouter free models sometimes reject response_format
        if ($provider !== 'openrouter') {
            $payload['response_format'] = ['type' => 'json_object'];
        }

        $res = $httpPost($endpoint, $payload, $headers);

        if (empty($res['ok']) || (int) ($res['status'] ?? 0) >= 400) {
            $status = (int) ($res['status'] ?? 0);
            $errJson = json_decode((string) ($res['body'] ?? ''), true);
            $apiMsg = is_array($errJson) ? (string) ($errJson['error']['message'] ?? '') : '';
            $detail = trim((string) ($res['error'] ?? '')) ?: $apiMsg;
            $isAuth = $status === 401 || $status === 403;
            return [
                'ok' => false,
                'parsed' => null,
                'error' => $isAuth ? 'API Key tidak valid/ditolak' : ($detail !== '' ? $detail : "HTTP {$status}"),
                'auth_error' => $isAuth,
            ];
        }

        $body = json_decode((string) ($res['body'] ?? ''), true);
        $content = $body['choices'][0]['message']['content'] ?? '';
        if (is_array($content)) {
            $parts = [];
            foreach ($content as $part) {
                if (is_array($part) && isset($part['text'])) {
                    $parts[] = (string) $part['text'];
                }
            }
            $rawText = implode("\n", $parts);
        } else {
            $rawText = (string) $content;
        }

        $parsed = self::extractJson($rawText);
        if (!is_array($parsed)) {
            return [
                'ok' => false,
                'parsed' => null,
                'error' => 'Respons AI tidak dapat dibaca',
                'auth_error' => false,
            ];
        }

        return ['ok' => true, 'parsed' => $parsed, 'error' => '', 'auth_error' => false];
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
     * @param array<int, string> $extraHeaders
     * @return array{ok:bool, status:int, body:string, error:string}
     */
    private static function curlPostJson(string $url, array $payload, array $extraHeaders = []): array
    {
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'status' => 0, 'body' => '', 'error' => 'Ekstensi PHP cURL tidak aktif'];
        }
        $headers = array_merge(['Content-Type: application/json', 'Accept: application/json'], $extraHeaders);
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 25,
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
