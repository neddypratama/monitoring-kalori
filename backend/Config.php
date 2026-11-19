<?php
declare(strict_types=1);

final class Config
{
    private static ?array $settings = null;

    public static function load(?array $overrides = null): void
    {
        if ($overrides !== null) {
            self::$settings = $overrides;
            return;
        }

        $config = [];
        $file = __DIR__ . '/config.php';
        if (is_file($file)) {
            $fromFile = require $file;
            if (is_array($fromFile)) {
                $config = $fromFile;
            }
        }

        // Support environment variables
        foreach (['DB_DRIVER', 'DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'DB_SOCKET'] as $key) {
            $envVal = getenv($key);
            if ($envVal !== false && $envVal !== '') {
                $config[$key] = $envVal;
            } elseif (isset($_ENV[$key]) && $_ENV[$key] !== '') {
                $config[$key] = $_ENV[$key];
            }
        }

        self::$settings = $config;
    }

    public static function reset(): void
    {
        self::$settings = [];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        if (self::$settings === null) {
            self::load();
        }
        return self::$settings[$key] ?? $default;
    }

    public static function getInt(string $key, int $default = 0): int
    {
        $val = self::get($key, $default);
        return is_numeric($val) ? (int) $val : $default;
    }

    public static function getDriver(): string
    {
        $explicit = self::get('DB_DRIVER');
        if ($explicit !== null && $explicit !== '') {
            return strtolower((string) $explicit);
        }

        // Auto-detect: if DB_HOST and DB_DATABASE are set, treat as mysql
        if (self::get('DB_HOST') && self::get('DB_DATABASE')) {
            return 'mysql';
        }

        return 'sqlite';
    }

    public static function isMySql(): bool
    {
        return self::getDriver() === 'mysql';
    }

    public static function isSqlite(): bool
    {
        return self::getDriver() === 'sqlite';
    }

    public static function getMySqlDsn(): string
    {
        $host = (string) self::get('DB_HOST', '127.0.0.1');
        $port = self::getInt('DB_PORT', 3306);
        $db = (string) self::get('DB_DATABASE', 'monitoring_kalori');
        $socket = self::get('DB_SOCKET');

        if ($socket) {
            return "mysql:unix_socket={$socket};dbname={$db};charset=utf8mb4";
        }

        return "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";
    }
}
