<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/Router.php';

echo "Running RouterApiTest...\n";

$pdo = Database::connect(':memory:');
$login = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'admin', 'password' => 'admin123']);
$token = (string) $login['session_token'];

Assert::test('GET profile before onboarding returns exists=false', function () use ($pdo, $token): void {
    $res = Router::handle($pdo, 'GET', 'profile', [], [], $token);
    Assert::equals(200, $res['status']);
    Assert::true($res['payload']['ok']);
    Assert::equals(false, $res['payload']['data']['exists']);
});

Assert::test('POST profile accepts Indonesian comma decimal and auto-creates initial weight log', function () use ($pdo, $token): void {
    $res = Router::handle($pdo, 'POST', 'profile', [], [
        'name' => 'Andi',
        'gender' => 'male',
        'age' => 26,
        'height_cm' => '170',
        'initial_weight_kg' => '70,5',
        'target_weight_kg' => '65',
        'activity_level' => 'sedentary',
        'goal_type' => 'lose',
    ], $token);
    Assert::equals(200, $res['status']);
    Assert::true($res['payload']['ok']);
    Assert::equals(true, $res['payload']['data']['exists']);
    Assert::approx(70.5, (float) $res['payload']['data']['profile']['initial_weight_kg'], 0.01);

    $wCount = (int) $pdo->query('SELECT COUNT(*) FROM weight_logs WHERE user_id = 1')->fetchColumn();
    Assert::equals(1, $wCount);
    $wVal = (float) $pdo->query('SELECT weight_kg FROM weight_logs WHERE user_id = 1 LIMIT 1')->fetchColumn();
    Assert::approx(70.5, $wVal, 0.01);
});

Assert::test('POST food-logs auto-calculates from catalog and supports manual entry', function () use ($pdo, $token): void {
    $nasi = $pdo->query("SELECT id FROM foods WHERE name = 'Nasi Putih' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $res = Router::handle($pdo, 'POST', 'food-logs', [], [
        'log_date' => '2026-11-18',
        'meal_type' => 'siang',
        'food_id' => (int) $nasi['id'],
        'quantity' => '1,5',
        'unit' => 'piring',
    ], $token);
    Assert::equals(201, $res['status']);
    Assert::equals('Nasi Putih', $res['payload']['data']['food_name']);
    Assert::equals(293, (int) $res['payload']['data']['calories']);
    Assert::equals(1, (int) $res['payload']['data']['user_id']);

    $manual = Router::handle($pdo, 'POST', 'food-logs', [], [
        'log_date' => '2026-11-18',
        'meal_type' => 'camilan',
        'food_id' => null,
        'food_name' => 'Kopi Susu Spesial',
        'quantity' => 1,
        'unit' => 'gelas',
        'calories' => 180,
    ], $token);
    Assert::equals(201, $manual['status']);
    Assert::equals(180, (int) $manual['payload']['data']['calories']);
});

Assert::test('custom food mutation preserves historical snapshots and built-in deletion is blocked (400)', function () use ($pdo, $token): void {
    $builtInId = (int) $pdo->query('SELECT id FROM foods WHERE is_custom = 0 LIMIT 1')->fetchColumn();
    $delBuiltIn = Router::handle($pdo, 'DELETE', 'foods', ['id' => $builtInId], [], $token);
    Assert::equals(400, $delBuiltIn['status']);
    Assert::equals(false, $delBuiltIn['payload']['ok']);

    $created = Router::handle($pdo, 'POST', 'foods', [], [
        'name' => 'Smoothie Pagi Kustom',
        'category' => 'Minuman',
        'default_unit' => 'gelas',
        'serving_grams' => 250,
        'calories_per_100g' => 80,
        'protein_per_100g' => 4,
        'carbs_per_100g' => 12,
        'fat_per_100g' => 2,
    ], $token);
    Assert::equals(201, $created['status']);
    $customId = (int) $created['payload']['data']['id'];

    $logged = Router::handle($pdo, 'POST', 'food-logs', [], [
        'log_date' => '2026-11-18',
        'meal_type' => 'sarapan',
        'food_id' => $customId,
        'quantity' => 1,
        'unit' => 'gelas',
    ], $token);
    Assert::equals(201, $logged['status']);
    $logId = (int) $logged['payload']['data']['id'];
    Assert::equals(200, (int) $logged['payload']['data']['calories']);

    $delCustom = Router::handle($pdo, 'DELETE', 'foods', ['id' => $customId], [], $token);
    Assert::equals(200, $delCustom['status']);

    $snap = $pdo->query("SELECT * FROM food_logs WHERE id = {$logId}")->fetch(PDO::FETCH_ASSOC);
    Assert::equals('Smoothie Pagi Kustom', $snap['food_name']);
    Assert::equals(200, (int) $snap['calories']);
    Assert::equals(null, $snap['food_id']);
});

Assert::test('POST activity-logs computes walking 500 m and rejects distance on Yoga', function () use ($pdo, $token): void {
    $jalan = $pdo->query("SELECT id FROM activities WHERE name = 'Jalan Santai' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $res = Router::handle($pdo, 'POST', 'activity-logs', [], [
        'log_date' => '2026-11-18',
        'activity_id' => (int) $jalan['id'],
        'input_value' => 500,
        'input_unit' => 'm',
    ], $token);
    Assert::equals(201, $res['status']);
    Assert::equals('Jalan Santai', $res['payload']['data']['activity_name']);
    Assert::approx(70.5, (float) $res['payload']['data']['weight_kg_used'], 0.01);
    Assert::equals(27, (int) $res['payload']['data']['calories_burned']);

    $yoga = $pdo->query("SELECT id FROM activities WHERE name = 'Yoga' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    $bad = Router::handle($pdo, 'POST', 'activity-logs', [], [
        'log_date' => '2026-11-18',
        'activity_id' => (int) $yoga['id'],
        'input_value' => 500,
        'input_unit' => 'm',
    ], $token);
    Assert::equals(400, $bad['status']);
    Assert::equals(false, $bad['payload']['ok']);
});

Assert::test('POST weight-logs upserts duplicate date without UNIQUE error', function () use ($pdo, $token): void {
    $r1 = Router::handle($pdo, 'POST', 'weight-logs', [], ['log_date' => '2026-11-17', 'weight_kg' => '70,8', 'notes' => 'Pagi'], $token);
    Assert::equals(200, $r1['status']);
    $r2 = Router::handle($pdo, 'POST', 'weight-logs', [], ['log_date' => '2026-11-17', 'weight_kg' => '70,2', 'notes' => 'Ulang'], $token);
    Assert::equals(200, $r2['status']);

    $cnt = (int) $pdo->query("SELECT COUNT(*) FROM weight_logs WHERE user_id = 1 AND log_date = '2026-11-17'")->fetchColumn();
    Assert::equals(1, $cnt);
    $val = (float) $pdo->query("SELECT weight_kg FROM weight_logs WHERE user_id = 1 AND log_date = '2026-11-17'")->fetchColumn();
    Assert::approx(70.2, $val, 0.01);
});

Assert::test('rejects out-of-range years in log_date with HTTP 400', function () use ($pdo, $token): void {
    $tooOld = Router::handle($pdo, 'POST', 'weight-logs', [], ['log_date' => '1926-11-18', 'weight_kg' => 70], $token);
    Assert::equals(400, $tooOld['status']);
    Assert::equals(false, $tooOld['payload']['ok']);

    $tooFuture = Router::handle($pdo, 'POST', 'weight-logs', [], ['log_date' => '2099-01-01', 'weight_kg' => 70], $token);
    Assert::equals(400, $tooFuture['status']);
    Assert::equals(false, $tooFuture['payload']['ok']);
});

Assert::test('GET dashboard, logs/day, and export return valid payloads', function () use ($pdo, $token): void {
    $dash = Router::handle($pdo, 'GET', 'dashboard', ['range' => '7d', 'date' => '2026-11-18'], [], $token);
    Assert::equals(200, $dash['status']);
    Assert::true(isset($dash['payload']['data']['evaluation']['status']));
    Assert::equals(7, count($dash['payload']['data']['calorie_series']));

    $day = Router::handle($pdo, 'GET', 'logs/day', ['date' => '2026-11-18'], [], $token);
    Assert::equals(200, $day['status']);
    Assert::true(count($day['payload']['data']['food_logs']) >= 2);
    Assert::equals(1, count($day['payload']['data']['activity_logs']));

    $exp = Router::handle($pdo, 'GET', 'export', [], [], $token);
    Assert::equals(200, $exp['status']);
    Assert::true(isset($exp['payload']['data']['exported_at']));
    Assert::true(isset($exp['payload']['data']['profile']));
    Assert::true(is_array($exp['payload']['data']['weight_logs']));
});

exit(Assert::summary('RouterApiTest'));
