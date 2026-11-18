<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';

echo "Running DatabaseSeedTest...\n";

$tempDb = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'kaloriku_seed_test_' . uniqid('', true) . '.sqlite';

try {
    $pdo = Database::connect($tempDb);

    Assert::test('creates all 11 required multi-user SQLite tables', function () use ($pdo): void {
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(PDO::FETCH_COLUMN);
        sort($tables);
        $expected = [
            'activities', 'activity_logs', 'audit_logs', 'food_logs', 'foods',
            'roles', 'user_favorites', 'user_profile', 'user_sessions', 'users', 'weight_logs',
        ];
        Assert::equals($expected, $tables);
    });

    Assert::test('seeds at least 120 Indonesian & common foods across all 7 categories with valid values', function () use ($pdo): void {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
        Assert::true($count >= 120, "Expected >= 120 foods, got {$count}");

        $categories = $pdo->query('SELECT DISTINCT category FROM foods')->fetchAll(PDO::FETCH_COLUMN);
        sort($categories);
        $expectedCats = ['Buah', 'Camilan', 'Lauk', 'Makanan Pokok', 'Masakan Jadi', 'Minuman', 'Sayur'];
        Assert::equals($expectedCats, $categories);

        $essentials = ['Nasi Putih', 'Nasi Goreng', 'Ayam Goreng', 'Tempe Goreng', 'Bakso Sapi', 'Es Teh Manis'];
        foreach ($essentials as $name) {
            $stmt = $pdo->prepare('SELECT COUNT(*) FROM foods WHERE name = ?');
            $stmt->execute([$name]);
            Assert::true((int) $stmt->fetchColumn() >= 1, "Missing essential food: {$name}");
        }

        $invalidCount = (int) $pdo->query('SELECT COUNT(*) FROM foods WHERE serving_grams <= 0 OR calories_per_100g < 0 OR is_custom != 0')->fetchColumn();
        Assert::equals(0, $invalidCount);
    });

    Assert::test('seeds at least 25 activities across 5 categories with valid MET and distance speeds', function () use ($pdo): void {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();
        Assert::true($count >= 25, "Expected >= 25 activities, got {$count}");

        $categories = $pdo->query('SELECT DISTINCT category FROM activities')->fetchAll(PDO::FETCH_COLUMN);
        sort($categories);
        $expectedCats = ['Aktivitas Harian', 'Jalan & Lari', 'Kardio', 'Kekuatan', 'Olahraga Permainan'];
        Assert::equals($expectedCats, $categories);

        $jalan = $pdo->query("SELECT * FROM activities WHERE name = 'Jalan Santai'")->fetch(PDO::FETCH_ASSOC);
        Assert::true(is_array($jalan), 'Missing Jalan Santai');
        Assert::equals(1, (int) $jalan['supports_distance']);
        Assert::approx(4.5, (float) $jalan['default_speed_kmh'], 0.01);
        Assert::approx(3.3, (float) $jalan['met'], 0.01);

        $yoga = $pdo->query("SELECT * FROM activities WHERE name = 'Yoga'")->fetch(PDO::FETCH_ASSOC);
        Assert::true(is_array($yoga), 'Missing Yoga');
        Assert::equals(0, (int) $yoga['supports_distance']);

        $invalidDist = (int) $pdo->query('SELECT COUNT(*) FROM activities WHERE supports_distance = 1 AND (default_speed_kmh IS NULL OR default_speed_kmh <= 0)')->fetchColumn();
        Assert::equals(0, $invalidDist);
    });

    Assert::test('Database::connect is idempotent and does not duplicate seed rows', function () use ($tempDb, $pdo): void {
        $beforeFoods = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
        $beforeActs = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();

        $pdo2 = Database::connect($tempDb);
        $afterFoods = (int) $pdo2->query('SELECT COUNT(*) FROM foods')->fetchColumn();
        $afterActs = (int) $pdo2->query('SELECT COUNT(*) FROM activities')->fetchColumn();

        Assert::equals($beforeFoods, $afterFoods);
        Assert::equals($beforeActs, $afterActs);
    });
} finally {
    unset($pdo);
    @unlink($tempDb);
    @unlink($tempDb . '-wal');
    @unlink($tempDb . '-shm');
}

exit(Assert::summary('DatabaseSeedTest'));
