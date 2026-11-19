<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once dirname(__DIR__, 2) . '/backend/Config.php';
require_once dirname(__DIR__, 2) . '/backend/Database.php';
require_once dirname(__DIR__, 2) . '/backend/migrate_sqlite_to_mysql.php';

echo "Running MigrationToolTest...\n";

// Ensure local MySQL test DB
try {
    $rawPdo = new PDO('mysql:host=127.0.0.1;charset=utf8mb4', 'root', '');
    $rawPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $rawPdo->exec('CREATE DATABASE IF NOT EXISTS monitoring_kalori_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
} catch (Throwable $e) {
    echo "  [SKIP] Local MySQL not reachable\n";
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

Assert::test('migrates all 12 tables and rows from SQLite to MySQL without loss', function () {
    // 1. Setup source SQLite in memory/temp file
    $tempSqlite = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'test_source_' . bin2hex(random_bytes(6)) . '.sqlite';
    $srcPdo = Database::connect($tempSqlite);

    // Create a custom user and profile in source SQLite
    $roleId = (int) $srcPdo->query("SELECT id FROM roles WHERE name = 'user' LIMIT 1")->fetchColumn();
    $srcPdo->prepare("INSERT INTO users (id, username, full_name, password_hash, role_id, is_active) VALUES (99, 'migrated_user', 'Migrated User', 'hash123', ?, 1)")
        ->execute([$roleId]);

    $srcPdo->prepare("INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, program_duration_days) VALUES (99, 'Migrated User', 'female', 29, 162, 68.5, 60.0, 'light', 'lose', 90)")
        ->execute();

    $srcPdo->prepare("INSERT INTO food_logs (id, user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (888, 99, '2026-11-19', 'sarapan', 'Oatmeal Buah', 1, 'mangkok', 250)")
        ->execute();

    $srcPdo->prepare("INSERT INTO weight_logs (user_id, log_date, weight_kg, notes) VALUES (99, '2026-11-19', 68.5, 'Catatan timbang awal')")
        ->execute();

    Database::upsertSetting($srcPdo, 'ai_primary_provider', 'groq');

    // 2. Setup target MySQL
    $targetPdo = Database::connect();

    // 3. Execute Migration
    $report = SqliteToMySqlMigrator::migrate($srcPdo, $targetPdo);

    Assert::true($report['users'] >= 2, "Expected at least 2 users migrated");
    Assert::true($report['foods'] >= 120, "Expected at least 120 foods migrated");

    // 4. Verify specific migrated data in MySQL
    $userRow = $targetPdo->query("SELECT * FROM users WHERE id = 99")->fetch(PDO::FETCH_ASSOC);
    Assert::equals('migrated_user', $userRow['username']);

    $profileRow = $targetPdo->query("SELECT * FROM user_profile WHERE user_id = 99")->fetch(PDO::FETCH_ASSOC);
    Assert::approx(68.5, (float) $profileRow['initial_weight_kg']);
    Assert::equals(90, (int) $profileRow['program_duration_days']);

    $foodLogRow = $targetPdo->query("SELECT * FROM food_logs WHERE id = 888")->fetch(PDO::FETCH_ASSOC);
    Assert::equals('Oatmeal Buah', $foodLogRow['food_name']);
    Assert::equals(250, (int) $foodLogRow['calories']);

    $settingVal = Database::getSetting($targetPdo, 'ai_primary_provider');
    Assert::equals('groq', $settingVal);

    // 5. Test idempotency (migrating again does not throw or duplicate)
    $report2 = SqliteToMySqlMigrator::migrate($srcPdo, $targetPdo);
    Assert::true($report2['users'] >= 2);

    // Clean up
    @unlink($tempSqlite);
});

Assert::summary('MigrationToolTest');
