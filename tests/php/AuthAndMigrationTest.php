<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/AuthService.php';
require_once __DIR__ . '/../../backend/AuditService.php';

echo "Running AuthAndMigrationTest...\n";

Assert::test('fresh database seeds system roles (admin, user) and default admin account', function (): void {
    $pdo = Database::connect(':memory:');

    $roles = $pdo->query('SELECT name, is_system, can_manage_users, can_manage_roles, can_view_all_users_data, can_view_audit_logs FROM roles ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);
    Assert::equals(2, count($roles));
    Assert::equals('admin', $roles[0]['name']);
    Assert::equals(1, (int) $roles[0]['is_system']);
    Assert::equals(1, (int) $roles[0]['can_manage_users']);
    Assert::equals(1, (int) $roles[0]['can_manage_roles']);
    Assert::equals(1, (int) $roles[0]['can_view_all_users_data']);
    Assert::equals(1, (int) $roles[0]['can_view_audit_logs']);

    Assert::equals('user', $roles[1]['name']);
    Assert::equals(1, (int) $roles[1]['is_system']);
    Assert::equals(0, (int) $roles[1]['can_manage_users']);

    $admin = $pdo->query("SELECT * FROM users WHERE username = 'admin'")->fetch(PDO::FETCH_ASSOC);
    Assert::true(is_array($admin), 'Default admin user missing');
    Assert::true(password_verify('admin123', (string) $admin['password_hash']), 'Default admin password hash invalid');
});

Assert::test('register, login, session authenticate, changePassword, and logout work with audit logs', function (): void {
    $pdo = Database::connect(':memory:');

    $reg = AuthService::register($pdo, 'siti_diet', 'Siti Rahma', 'rahasia123');
    Assert::equals('siti_diet', $reg['user']['username']);
    Assert::equals('user', $reg['user']['role_name']);
    Assert::true(strlen($reg['token']) === 64);

    // Duplicate username rejected
    Assert::throws(InvalidArgumentException::class, fn() => AuthService::register($pdo, 'SITI_DIET', 'Siti 2', 'rahasia123'));

    // Authenticate session
    $authUser = AuthService::authenticate($pdo, $reg['token']);
    Assert::true($authUser !== null);
    Assert::equals($reg['user']['id'], $authUser['id']);
    Assert::equals(false, AuthService::hasPermission($authUser, 'can_manage_users'));

    // Wrong password rejected
    Assert::throws(InvalidArgumentException::class, fn() => AuthService::login($pdo, 'siti_diet', 'salahpass'));

    // Change password works & logs audit
    AuthService::changePassword($pdo, (int) $reg['user']['id'], 'rahasia123', 'barupass99');
    $loginNew = AuthService::login($pdo, 'siti_diet', 'barupass99');
    Assert::equals('siti_diet', $loginNew['user']['username']);

    // Logout invalidates token
    AuthService::logout($pdo, $loginNew['token']);
    Assert::equals(null, AuthService::authenticate($pdo, $loginNew['token']));

    // Inactive user cannot login
    $pdo->prepare('UPDATE users SET is_active = 0 WHERE id = ?')->execute([$reg['user']['id']]);
    Assert::throws(InvalidArgumentException::class, fn() => AuthService::login($pdo, 'siti_diet', 'barupass99'));

    // Audit logs recorded register, change_password, login, logout
    $logs = AuditService::listLogs($pdo, ['user_id' => $reg['user']['id']]);
    Assert::true(count($logs) >= 3, 'Expected >= 3 audit logs for user');
});

Assert::test('backward-compatible migration upgrades legacy Phase-1 SQLite DB without data loss', function (): void {
    $tempDb = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'kaloriku_legacy_mig_' . uniqid('', true) . '.sqlite';
    try {
        // Build legacy Phase-1 database (no user_id columns, no roles/users tables)
        $legacy = new PDO('sqlite:' . $tempDb);
        $legacy->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $legacy->exec(<<<'SQL'
            CREATE TABLE user_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT NOT NULL DEFAULT '',
                gender TEXT NOT NULL,
                age INTEGER NOT NULL,
                height_cm REAL NOT NULL,
                initial_weight_kg REAL NOT NULL,
                target_weight_kg REAL NULL,
                activity_level TEXT NOT NULL,
                goal_type TEXT NOT NULL,
                daily_calorie_target INTEGER NULL,
                is_manual_target INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL, category TEXT NOT NULL, default_unit TEXT NOT NULL,
                serving_grams REAL NOT NULL, calories_per_100g REAL NOT NULL,
                protein_per_100g REAL NOT NULL DEFAULT 0, carbs_per_100g REAL NOT NULL DEFAULT 0,
                fat_per_100g REAL NOT NULL DEFAULT 0, is_custom INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL, category TEXT NOT NULL, met REAL NOT NULL,
                supports_distance INTEGER NOT NULL DEFAULT 0, default_speed_kmh REAL NULL,
                is_custom INTEGER NOT NULL DEFAULT 0, is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE food_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT, log_date TEXT NOT NULL, meal_type TEXT NOT NULL,
                food_id INTEGER NULL, food_name TEXT NOT NULL, quantity REAL NOT NULL, unit TEXT NOT NULL,
                calories INTEGER NOT NULL, protein REAL NOT NULL DEFAULT 0, carbs REAL NOT NULL DEFAULT 0,
                fat REAL NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT, log_date TEXT NOT NULL, activity_id INTEGER NULL,
                activity_name TEXT NOT NULL, input_value REAL NOT NULL, input_unit TEXT NOT NULL,
                duration_minutes REAL NOT NULL, distance_meters REAL NULL, weight_kg_used REAL NOT NULL,
                calories_burned INTEGER NOT NULL, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE TABLE weight_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT, log_date TEXT NOT NULL UNIQUE, weight_kg REAL NOT NULL,
                notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            INSERT INTO user_profile (id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type)
            VALUES (1, 'Owner Lama', 'male', 28, 172, 74.5, 68, 'sedentary', 'lose');
            INSERT INTO foods (name, category, default_unit, serving_grams, calories_per_100g, is_custom, is_favorite)
            VALUES ('Nasi Kustom Lama', 'Masakan Jadi', 'piring', 200, 150, 1, 1);
            INSERT INTO food_logs (log_date, meal_type, food_id, food_name, quantity, unit, calories)
            VALUES ('2026-11-18', 'siang', 1, 'Nasi Kustom Lama', 1, 'piring', 300);
            INSERT INTO weight_logs (log_date, weight_kg, notes)
            VALUES ('2026-11-18', 74.5, 'Awal');
        SQL);
        unset($legacy);

        // Now connect via Database::connect — should auto-migrate seamlessly!
        $pdo = Database::connect($tempDb);

        $prof = $pdo->query('SELECT * FROM user_profile WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);
        Assert::true(is_array($prof), 'Legacy profile not migrated to user_id = 1');
        Assert::equals('Owner Lama', $prof['name']);

        $fLog = $pdo->query('SELECT * FROM food_logs WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);
        Assert::equals('Nasi Kustom Lama', $fLog['food_name']);

        $wLog = $pdo->query('SELECT * FROM weight_logs WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);
        Assert::approx(74.5, (float) $wLog['weight_kg'], 0.01);

        $customFood = $pdo->query("SELECT user_id FROM foods WHERE name = 'Nasi Kustom Lama'")->fetch(PDO::FETCH_ASSOC);
        Assert::equals(1, (int) $customFood['user_id']);

        $favCount = (int) $pdo->query("SELECT COUNT(*) FROM user_favorites WHERE user_id = 1 AND item_type = 'food'")->fetchColumn();
        Assert::equals(1, $favCount);
    } finally {
        unset($pdo);
        @unlink($tempDb);
        @unlink($tempDb . '-wal');
        @unlink($tempDb . '-shm');
    }
});

exit(Assert::summary('AuthAndMigrationTest'));
