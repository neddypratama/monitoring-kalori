<?php
declare(strict_types=1);

require_once __DIR__ . '/SeedData.php';

final class Database
{
    public static function defaultPath(): string
    {
        return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'monitoring_kalori.sqlite';
    }

    public static function connect(?string $dbPath = null): PDO
    {
        $path = $dbPath ?? self::defaultPath();
        if ($path !== ':memory:') {
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
        }

        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        if ($path !== ':memory:') {
            $pdo->exec('PRAGMA journal_mode = WAL;');
        }

        self::migrate($pdo);
        self::seedRolesAndAdmin($pdo);
        SeedData::seedIfEmpty($pdo);

        return $pdo;
    }

    public static function migrate(PDO $pdo): void
    {
        // 1. Auth, RBAC, Favorites, and Audit Log tables
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT NOT NULL DEFAULT '',
                can_manage_users INTEGER NOT NULL DEFAULT 0,
                can_manage_roles INTEGER NOT NULL DEFAULT 0,
                can_view_all_users_data INTEGER NOT NULL DEFAULT 0,
                can_view_audit_logs INTEGER NOT NULL DEFAULT 0,
                is_system INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                role_id INTEGER NOT NULL REFERENCES roles(id),
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

            CREATE TABLE IF NOT EXISTS user_favorites (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                item_type TEXT NOT NULL CHECK (item_type IN ('food', 'activity')),
                item_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                PRIMARY KEY (user_id, item_type, item_id)
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
                username_snapshot TEXT NOT NULL DEFAULT 'system',
                action TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NULL,
                target_user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
                details TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
        SQL);

        // Ensure default roles and admin user (id=1) exist before migrating legacy rows
        self::seedRolesAndAdmin($pdo);

        // 2. Check whether legacy Phase-1 tables exist without user_id
        if (self::tableExists($pdo, 'user_profile') && !self::hasColumn($pdo, 'user_profile', 'user_id')) {
            self::upgradeLegacyTables($pdo);
            self::ensureProfileDurationColumns($pdo);
            return;
        }

        // 3. Fresh multi-user domain tables
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS user_profile (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT '',
                gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
                age INTEGER NOT NULL,
                height_cm REAL NOT NULL,
                initial_weight_kg REAL NOT NULL,
                target_weight_kg REAL NULL,
                activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
                goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
                daily_calorie_target INTEGER NULL,
                is_manual_target INTEGER NOT NULL DEFAULT 0,
                program_duration_days INTEGER NULL,
                program_start_date TEXT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                default_unit TEXT NOT NULL DEFAULT 'porsi',
                serving_grams REAL NOT NULL,
                calories_per_100g REAL NOT NULL,
                protein_per_100g REAL NOT NULL DEFAULT 0,
                carbs_per_100g REAL NOT NULL DEFAULT 0,
                fat_per_100g REAL NOT NULL DEFAULT 0,
                is_custom INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                met REAL NOT NULL,
                supports_distance INTEGER NOT NULL DEFAULT 0,
                default_speed_kmh REAL NULL,
                is_custom INTEGER NOT NULL DEFAULT 0,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS food_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                log_date TEXT NOT NULL,
                meal_type TEXT NOT NULL CHECK (meal_type IN ('sarapan', 'siang', 'malam', 'camilan')),
                food_id INTEGER NULL REFERENCES foods(id) ON DELETE SET NULL,
                food_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                calories INTEGER NOT NULL,
                protein REAL NOT NULL DEFAULT 0,
                carbs REAL NOT NULL DEFAULT 0,
                fat REAL NOT NULL DEFAULT 0,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);

            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                log_date TEXT NOT NULL,
                activity_id INTEGER NULL REFERENCES activities(id) ON DELETE SET NULL,
                activity_name TEXT NOT NULL,
                input_value REAL NOT NULL,
                input_unit TEXT NOT NULL CHECK (input_unit IN ('m', 'km', 'menit')),
                duration_minutes REAL NOT NULL,
                distance_meters REAL NULL,
                weight_kg_used REAL NOT NULL,
                calories_burned INTEGER NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );
            CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, log_date);

            CREATE TABLE IF NOT EXISTS weight_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                log_date TEXT NOT NULL,
                weight_kg REAL NOT NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                UNIQUE (user_id, log_date)
            );
            CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);
        SQL);

        self::ensureProfileDurationColumns($pdo);
    }

    private static function ensureProfileDurationColumns(PDO $pdo): void
    {
        if (self::tableExists($pdo, 'user_profile')) {
            if (!self::hasColumn($pdo, 'user_profile', 'program_duration_days')) {
                $pdo->exec('ALTER TABLE user_profile ADD COLUMN program_duration_days INTEGER NULL');
            }
            if (!self::hasColumn($pdo, 'user_profile', 'program_start_date')) {
                $pdo->exec('ALTER TABLE user_profile ADD COLUMN program_start_date TEXT NULL');
            }
        }
    }

    private static function seedRolesAndAdmin(PDO $pdo): void
    {
        $roleCount = (int) $pdo->query('SELECT COUNT(*) FROM roles')->fetchColumn();
        if ($roleCount === 0) {
            $stmt = $pdo->prepare(
                'INSERT INTO roles (name, description, can_manage_users, can_manage_roles, can_view_all_users_data, can_view_audit_logs, is_system)
                 VALUES (?, ?, ?, ?, ?, ?, 1)'
            );
            $stmt->execute(['admin', 'Administrator sistem penuh (kelola user, role, pantau diet, & log)', 1, 1, 1, 1]);
            $stmt->execute(['user', 'Pengguna standar program diet pribadi', 0, 0, 0, 0]);
        }

        $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($userCount === 0) {
            $adminRoleId = (int) $pdo->query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1")->fetchColumn();
            $hash = password_hash('admin123', PASSWORD_DEFAULT);
            $stmt = $pdo->prepare(
                'INSERT INTO users (id, username, full_name, password_hash, role_id, is_active)
                 VALUES (1, ?, ?, ?, ?, 1)'
            );
            $stmt->execute(['admin', 'Administrator', $hash, $adminRoleId]);
        }
    }

    private static function upgradeLegacyTables(PDO $pdo): void
    {
        $pdo->exec('PRAGMA foreign_keys = OFF;');
        $pdo->beginTransaction();
        try {
            // Upgrade foods & activities
            if (!self::hasColumn($pdo, 'foods', 'user_id')) {
                $pdo->exec('ALTER TABLE foods ADD COLUMN user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE');
                $pdo->exec('UPDATE foods SET user_id = 1 WHERE is_custom = 1');
                $pdo->exec("INSERT OR IGNORE INTO user_favorites (user_id, item_type, item_id) SELECT 1, 'food', id FROM foods WHERE is_favorite = 1");
            }
            if (!self::hasColumn($pdo, 'activities', 'user_id')) {
                $pdo->exec('ALTER TABLE activities ADD COLUMN user_id INTEGER NULL REFERENCES users(id) ON DELETE CASCADE');
                $pdo->exec('UPDATE activities SET user_id = 1 WHERE is_custom = 1');
                $pdo->exec("INSERT OR IGNORE INTO user_favorites (user_id, item_type, item_id) SELECT 1, 'activity', id FROM activities WHERE is_favorite = 1");
            }

            // Rebuild user_profile with user_id PK
            $pdo->exec('ALTER TABLE user_profile RENAME TO _legacy_user_profile');
            $pdo->exec(<<<'SQL'
                CREATE TABLE user_profile (
                    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                    name TEXT NOT NULL DEFAULT '',
                    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
                    age INTEGER NOT NULL,
                    height_cm REAL NOT NULL,
                    initial_weight_kg REAL NOT NULL,
                    target_weight_kg REAL NULL,
                    activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active')),
                    goal_type TEXT NOT NULL CHECK (goal_type IN ('lose', 'maintain', 'gain')),
                    daily_calorie_target INTEGER NULL,
                    is_manual_target INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );
                INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, daily_calorie_target, is_manual_target, created_at, updated_at)
                SELECT 1, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, daily_calorie_target, is_manual_target, created_at, updated_at
                FROM _legacy_user_profile;
                DROP TABLE _legacy_user_profile;
            SQL);

            // Rebuild food_logs with user_id
            $pdo->exec('ALTER TABLE food_logs RENAME TO _legacy_food_logs');
            $pdo->exec(<<<'SQL'
                CREATE TABLE food_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    log_date TEXT NOT NULL,
                    meal_type TEXT NOT NULL CHECK (meal_type IN ('sarapan', 'siang', 'malam', 'camilan')),
                    food_id INTEGER NULL REFERENCES foods(id) ON DELETE SET NULL,
                    food_name TEXT NOT NULL,
                    quantity REAL NOT NULL,
                    unit TEXT NOT NULL,
                    calories INTEGER NOT NULL,
                    protein REAL NOT NULL DEFAULT 0,
                    carbs REAL NOT NULL DEFAULT 0,
                    fat REAL NOT NULL DEFAULT 0,
                    notes TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );
                INSERT INTO food_logs (id, user_id, log_date, meal_type, food_id, food_name, quantity, unit, calories, protein, carbs, fat, notes, created_at)
                SELECT id, 1, log_date, meal_type, food_id, food_name, quantity, unit, calories, protein, carbs, fat, notes, created_at
                FROM _legacy_food_logs;
                DROP TABLE _legacy_food_logs;
                CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON food_logs(user_id, log_date);
            SQL);

            // Rebuild activity_logs with user_id
            $pdo->exec('ALTER TABLE activity_logs RENAME TO _legacy_activity_logs');
            $pdo->exec(<<<'SQL'
                CREATE TABLE activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    log_date TEXT NOT NULL,
                    activity_id INTEGER NULL REFERENCES activities(id) ON DELETE SET NULL,
                    activity_name TEXT NOT NULL,
                    input_value REAL NOT NULL,
                    input_unit TEXT NOT NULL CHECK (input_unit IN ('m', 'km', 'menit')),
                    duration_minutes REAL NOT NULL,
                    distance_meters REAL NULL,
                    weight_kg_used REAL NOT NULL,
                    calories_burned INTEGER NOT NULL,
                    notes TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
                );
                INSERT INTO activity_logs (id, user_id, log_date, activity_id, activity_name, input_value, input_unit, duration_minutes, distance_meters, weight_kg_used, calories_burned, notes, created_at)
                SELECT id, 1, log_date, activity_id, activity_name, input_value, input_unit, duration_minutes, distance_meters, weight_kg_used, calories_burned, notes, created_at
                FROM _legacy_activity_logs;
                DROP TABLE _legacy_activity_logs;
                CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, log_date);
            SQL);

            // Rebuild weight_logs with UNIQUE(user_id, log_date)
            $pdo->exec('ALTER TABLE weight_logs RENAME TO _legacy_weight_logs');
            $pdo->exec(<<<'SQL'
                CREATE TABLE weight_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    log_date TEXT NOT NULL,
                    weight_kg REAL NOT NULL,
                    notes TEXT NOT NULL DEFAULT '',
                    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                    UNIQUE (user_id, log_date)
                );
                INSERT INTO weight_logs (id, user_id, log_date, weight_kg, notes, created_at, updated_at)
                SELECT id, 1, log_date, weight_kg, notes, created_at, updated_at
                FROM _legacy_weight_logs;
                DROP TABLE _legacy_weight_logs;
                CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON weight_logs(user_id, log_date);
            SQL);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        } finally {
            $pdo->exec('PRAGMA foreign_keys = ON;');
        }
    }

    private static function tableExists(PDO $pdo, string $table): bool
    {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?");
        $stmt->execute([$table]);
        return (int) $stmt->fetchColumn() > 0;
    }

    private static function hasColumn(PDO $pdo, string $table, string $column): bool
    {
        $rows = $pdo->query("PRAGMA table_info({$table})")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            if (($r['name'] ?? '') === $column) {
                return true;
            }
        }
        return false;
    }
}
