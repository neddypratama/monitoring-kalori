<?php
declare(strict_types=1);

require_once __DIR__ . '/Config.php';
require_once __DIR__ . '/Database.php';

final class SqliteToMySqlMigrator
{
    /**
     * @var list<string>
     */
    private const TABLES = [
        'roles',
        'users',
        'user_sessions',
        'app_settings',
        'user_profile',
        'foods',
        'activities',
        'food_logs',
        'activity_logs',
        'weight_logs',
        'user_favorites',
        'audit_logs',
    ];

    /**
     * @return array<string, int>
     */
    public static function migrate(PDO $srcSqlite, PDO $targetMySql, bool $verbose = false): array
    {
        // 1. Ensure target schema is up to date
        Database::migrate($targetMySql);

        $counts = [];
        $targetMySql->exec('SET FOREIGN_KEY_CHECKS = 0;');

        try {
            foreach (self::TABLES as $table) {
                if (!Database::tableExists($srcSqlite, $table)) {
                    $counts[$table] = 0;
                    continue;
                }

                $rows = $srcSqlite->query("SELECT * FROM {$table}")->fetchAll(PDO::FETCH_ASSOC);
                if (empty($rows)) {
                    $counts[$table] = 0;
                    if ($verbose) {
                        echo "  - Tabel `{$table}`: 0 data disalin.\n";
                    }
                    continue;
                }

                $columns = array_keys($rows[0]);
                $colList = implode(', ', array_map(fn($c) => "`{$c}`", $columns));
                $placeholders = implode(', ', array_fill(0, count($columns), '?'));

                $updateParts = [];
                foreach ($columns as $c) {
                    $updateParts[] = "`{$c}` = VALUES(`{$c}`)";
                }
                $updateClause = implode(', ', $updateParts);

                $sql = "INSERT INTO `{$table}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updateClause}";
                $stmt = $targetMySql->prepare($sql);

                $tableCount = 0;
                foreach ($rows as $row) {
                    $stmt->execute(array_values($row));
                    $tableCount++;
                }

                $counts[$table] = $tableCount;
                if ($verbose) {
                    echo "  - Tabel `{$table}`: {$tableCount} baris berhasil disalin.\n";
                }
            }
        } finally {
            $targetMySql->exec('SET FOREIGN_KEY_CHECKS = 1;');
        }

        return $counts;
    }
}

// If invoked directly from CLI
if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === realpath(__FILE__)) {
    echo "\n=== KaloriKu: Migrasi Data SQLite -> MySQL ===\n\n";

    $sqlitePath = $argv[1] ?? Database::defaultPath();
    if (!file_exists($sqlitePath)) {
        fwrite(STDERR, "❌ File SQLite tidak ditemukan di: {$sqlitePath}\n");
        fwrite(STDERR, "   Jika lokasi file berbeda, jalankan: php backend/migrate_sqlite_to_mysql.php /path/to/db.sqlite\n\n");
        exit(1);
    }

    echo "1. Membaca sumber SQLite: {$sqlitePath}\n";
    $src = Database::connect($sqlitePath);

    echo "2. Menghubungkan ke target MySQL...\n";
    if (!Config::isMySql()) {
        fwrite(STDERR, "❌ Driver MySQL belum diatur di backend/config.php atau environment!\n");
        fwrite(STDERR, "   Pastikan file `backend/config.php` telah dibuat dari `backend/config.sample.php`.\n\n");
        exit(1);
    }

    try {
        $target = Database::connect();
        echo "   ✓ Terhubung ke MySQL database: " . Config::get('DB_DATABASE') . "\n";
    } catch (Throwable $e) {
        fwrite(STDERR, "❌ Gagal terhubung ke MySQL: {$e->getMessage()}\n\n");
        exit(1);
    }

    echo "3. Menyalin data ke MySQL...\n";
    $report = SqliteToMySqlMigrator::migrate($src, $target, true);

    echo "\n🎉 MIGRASI SUKSES!\n";
    $total = array_sum($report);
    echo "Total data disalin: {$total} baris di seluruh " . count($report) . " tabel.\n\n";
}
