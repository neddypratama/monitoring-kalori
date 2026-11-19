<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once dirname(__DIR__, 2) . '/backend/Config.php';
require_once dirname(__DIR__, 2) . '/backend/Database.php';
require_once dirname(__DIR__, 2) . '/backend/AuthService.php';
require_once dirname(__DIR__, 2) . '/backend/Router.php';

echo "Running MySqlDatabaseTest...\n";

// Ensure local MySQL is accessible
try {
    $rawPdo = new PDO('mysql:host=127.0.0.1;charset=utf8mb4', 'root', '');
    $rawPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $rawPdo->exec('CREATE DATABASE IF NOT EXISTS monitoring_kalori_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
} catch (Throwable $e) {
    echo "  [SKIP] Local MySQL (127.0.0.1) not reachable: {$e->getMessage()}\n";
    exit(0);
}

Config::load([
    'DB_DRIVER' => 'mysql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => 3306,
    'DB_DATABASE' => 'monitoring_kalori_test',
    'DB_USERNAME' => 'root',
    'DB_PASSWORD' => '',
]);

Assert::test('connects to MySQL, runs migrations, and creates all 12 InnoDB tables', function () {
    $pdo = Database::connect();
    Assert::equals('mysql', Database::getDriver($pdo));

    $expectedTables = [
        'roles', 'users', 'user_sessions', 'user_favorites', 'audit_logs', 'app_settings',
        'user_profile', 'foods', 'activities', 'food_logs', 'activity_logs', 'weight_logs'
    ];

    $stmt = $pdo->query("SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'monitoring_kalori_test'");
    $tables = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $tables[strtolower($row['TABLE_NAME'])] = strtoupper($row['ENGINE'] ?? '');
    }

    foreach ($expectedTables as $t) {
        Assert::true(isset($tables[$t]), "Table {$t} should exist in MySQL");
        Assert::equals('INNODB', $tables[$t], "Table {$t} should use InnoDB engine");
    }
});

Assert::test('seeds initial roles, admin, and catalog items in MySQL idempotently', function () {
    $pdo = Database::connect();

    $roleCount = (int) $pdo->query('SELECT COUNT(*) FROM roles')->fetchColumn();
    Assert::true($roleCount >= 2, "Roles table should have at least 2 roles, got {$roleCount}");

    $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE username = 'admin'")->fetchColumn();
    Assert::equals(1, $adminCount, "Admin user must exist exactly once");

    $foodCount = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
    Assert::true($foodCount >= 120, "Foods catalog should have >= 120 rows, got {$foodCount}");

    $activityCount = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();
    Assert::true($activityCount >= 25, "Activities catalog should have >= 25 rows, got {$activityCount}");
});

Assert::test('query helpers (upsertSetting, upsertWeightLog, insertFavorite) work on MySQL', function () {
    $pdo = Database::connect();

    // 1. Setting upsert
    Database::upsertSetting($pdo, 'test_key', 'value_v1');
    $val = Database::getSetting($pdo, 'test_key');
    Assert::equals('value_v1', $val);

    Database::upsertSetting($pdo, 'test_key', 'value_v2');
    $val2 = Database::getSetting($pdo, 'test_key');
    Assert::equals('value_v2', $val2);

    // 2. Favorite insert
    Database::insertFavorite($pdo, 1, 'food', 10);
    // Duplicate insert should not throw
    Database::insertFavorite($pdo, 1, 'food', 10);
    $favCount = (int) $pdo->query("SELECT COUNT(*) FROM user_favorites WHERE user_id = 1 AND item_type = 'food' AND item_id = 10")->fetchColumn();
    Assert::equals(1, $favCount);

    // 3. Weight log upsert
    $adminId = 1;
    $date = '2026-11-19';
    Database::upsertWeightLog($pdo, $adminId, $date, 70.5, 'Catatan 1');
    $row = $pdo->query("SELECT weight_kg, notes FROM weight_logs WHERE user_id = {$adminId} AND log_date = '{$date}'")->fetch(PDO::FETCH_ASSOC);
    Assert::approx(70.5, (float) $row['weight_kg']);
    Assert::equals('Catatan 1', $row['notes']);

    Database::upsertWeightLog($pdo, $adminId, $date, 69.8, 'Catatan update');
    $row2 = $pdo->query("SELECT weight_kg, notes FROM weight_logs WHERE user_id = {$adminId} AND log_date = '{$date}'")->fetch(PDO::FETCH_ASSOC);
    Assert::approx(69.8, (float) $row2['weight_kg']);
    Assert::equals('Catatan update', $row2['notes']);
});

Assert::test('AuthService and Router work seamlessly on MySQL database', function () {
    $pdo = Database::connect();

    // Clean test users except system admin
    $pdo->exec("DELETE FROM users WHERE username LIKE 'mysql_user_%'");

    // 1. Register new user on MySQL (pending activation)
    $reg = AuthService::register($pdo, 'mysql_user_1', 'MySQL Test User', 'password123');
    Assert::true($reg['pending_activation'] ?? false);
    $newUserId = (int) $reg['user']['id'];

    // 2. Admin activates user
    $upd = $pdo->prepare("UPDATE users SET is_active = 1 WHERE id = ?");
    $upd->execute([$newUserId]);

    // 3. User logs in and creates session
    $login = AuthService::login($pdo, 'mysql_user_1', 'password123');
    $token = $login['token'];
    Assert::true(!empty($token));

    // 4. Authenticate session
    $auth = AuthService::authenticate($pdo, $token);
    Assert::true($auth !== null);
    Assert::equals('mysql_user_1', $auth['username']);

    // 5. Create profile & initial weight log on MySQL
    $res = Router::handle($pdo, 'POST', 'profile', [], [
        'name' => 'MySQL User',
        'gender' => 'male',
        'age' => 28,
        'height_cm' => 175,
        'initial_weight_kg' => 75.5,
        'target_weight_kg' => 70.0,
        'activity_level' => 'moderate',
        'goal_type' => 'lose',
        'program_duration_days' => 60,
    ], $token);
    Assert::equals(200, $res['status']);
    Assert::true($res['payload']['ok']);
    Assert::true($res['payload']['data']['exists']);

    // 6. Log food on MySQL
    $foodRes = Router::handle($pdo, 'POST', 'food-logs', [], [
        'log_date' => '2026-11-19',
        'meal_type' => 'siang',
        'food_name' => 'Nasi Padang Spesial',
        'calories' => 650,
        'quantity' => 1,
        'unit' => 'porsi',
    ], $token);
    Assert::equals(201, $foodRes['status']);
    Assert::equals(650, $foodRes['payload']['data']['calories']);

    // 7. Change password on MySQL
    AuthService::changePassword($pdo, $newUserId, 'password123', 'new_password123');
    $loginAfter = AuthService::login($pdo, 'mysql_user_1', 'new_password123');
    Assert::true(!empty($loginAfter['token']));
});

Assert::summary('MySqlDatabaseTest');
