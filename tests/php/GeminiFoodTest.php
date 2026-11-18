<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/Router.php';
require_once __DIR__ . '/../../backend/GeminiFoodService.php';

echo "Running GeminiFoodTest...\n";

Assert::test('rejects missing API key and invalid image inputs', function (): void {
    Assert::throws(
        InvalidArgumentException::class,
        fn() => GeminiFoodService::analyzeFoodPhoto('', 'gemini-2.5-flash', 'dGVzdA==', 'image/jpeg')
    );
    Assert::throws(
        InvalidArgumentException::class,
        fn() => GeminiFoodService::analyzeFoodPhoto('AIzaFakeKey123456', 'gemini-2.5-flash', '', 'image/jpeg')
    );
    Assert::throws(
        InvalidArgumentException::class,
        fn() => GeminiFoodService::analyzeFoodPhoto('AIzaFakeKey123456', 'gemini-2.5-flash', 'dGVzdA==', 'application/pdf')
    );
});

Assert::test('parses Gemini Vision JSON output (including fenced JSON) into normalized food items and totals', function (): void {
    $mockPost = static function (string $url, array $payload): array {
        Assert::true(str_contains($url, 'gemini-2.5-flash:generateContent'), 'Unexpected Gemini URL');
        Assert::true(isset($payload['contents'][0]['parts'][1]['inline_data']['data']), 'Missing inline_data image');

        $aiJson = json_encode([
            'meal_summary' => 'Nasi Putih dengan Ayam Goreng dan Tempe',
            'confidence' => 'tinggi',
            'notes' => 'Estimasi porsi standar piring Indonesia',
            'items' => [
                [
                    'name' => 'Nasi Putih',
                    'unit' => 'piring',
                    'quantity' => 1,
                    'estimated_grams' => 150,
                    'calories' => 195,
                    'protein' => 4.1,
                    'carbs' => 42.0,
                    'fat' => 0.5,
                ],
                [
                    'name' => 'Ayam Goreng',
                    'unit' => 'potong',
                    'quantity' => 1,
                    'estimated_grams' => 100,
                    'calories' => 260,
                    'protein' => 25.0,
                    'carbs' => 4.5,
                    'fat' => 15.5,
                ],
            ],
        ]);

        return [
            'ok' => true,
            'status' => 200,
            'body' => json_encode([
                'candidates' => [[
                    'content' => [
                        'parts' => [['text' => "```json\n{$aiJson}\n```"]],
                    ],
                ]],
            ]),
            'error' => '',
        ];
    };

    $res = GeminiFoodService::analyzeFoodPhoto(
        'AIzaFakeKey123456',
        'gemini-2.5-flash',
        base64_encode('fake-jpeg-bytes'),
        'image/jpeg',
        'nasi normal',
        $mockPost
    );

    Assert::equals('Nasi Putih dengan Ayam Goreng dan Tempe', $res['meal_summary']);
    Assert::equals(2, count($res['items']));
    Assert::equals(455, (int) $res['total_calories']);
    Assert::approx(29.1, (float) $res['total_protein'], 0.1);
    Assert::approx(46.5, (float) $res['total_carbs'], 0.1);
    Assert::approx(16.0, (float) $res['total_fat'], 0.1);
});

Assert::test('Router saves profile program_duration_days and protects admin/settings with RBAC', function (): void {
    $pdo = Database::connect(':memory:');
    $adminLogin = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'admin', 'password' => 'admin123']);
    $adminToken = (string) $adminLogin['session_token'];

    // Save profile with 90-day duration (3 months)
    $prof = Router::handle($pdo, 'POST', 'profile', [], [
        'name' => 'Admin',
        'gender' => 'male',
        'age' => 28,
        'height_cm' => 172,
        'initial_weight_kg' => 78,
        'target_weight_kg' => 70,
        'activity_level' => 'sedentary',
        'goal_type' => 'lose',
        'program_duration_days' => 90,
        'program_start_date' => '2026-11-18',
    ], $adminToken);
    Assert::equals(200, $prof['status']);
    Assert::equals(90, (int) $prof['payload']['data']['profile']['program_duration_days']);
    Assert::true(isset($prof['payload']['data']['metrics']['diet_plan']['suggested_exercise_burn']));

    // Regular user gets 403 on admin/settings
    $reg = Router::handle($pdo, 'POST', 'auth/register', [], ['username' => 'u_biasa', 'full_name' => 'Biasa', 'password' => 'pass1234']);
    $userToken = (string) $reg['session_token'];
    Assert::equals(403, Router::handle($pdo, 'GET', 'admin/settings', [], [], $userToken)['status']);

    // Admin saves Gemini API key & reads masked status
    $saveSet = Router::handle($pdo, 'POST', 'admin/settings', [], [
        'gemini_api_key' => 'AIzaSyDemoSecretKey1234567890',
        'gemini_model' => 'gemini-2.5-flash',
    ], $adminToken);
    Assert::equals(200, $saveSet['status']);
    Assert::equals(true, $saveSet['payload']['data']['has_gemini_key']);
    Assert::true(str_contains((string) $saveSet['payload']['data']['gemini_key_masked'], 'AIza'));
    Assert::true(!str_contains((string) $saveSet['payload']['data']['gemini_key_masked'], 'DemoSecretKey'));
});

exit(Assert::summary('GeminiFoodTest'));
