<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

try {
    $pdo = Database::connect();
    $foodCount = (int) $pdo->query('SELECT COUNT(*) FROM foods')->fetchColumn();
    $actCount = (int) $pdo->query('SELECT COUNT(*) FROM activities')->fetchColumn();
    $userCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    echo "✅ Database SQLite siap & termigrasi ({$foodCount} makanan, {$actCount} aktivitas, {$userCount} user).\n";
} catch (Throwable $e) {
    fwrite(STDERR, '❌ Gagal migrasi database: ' . $e->getMessage() . "\n");
    exit(1);
}
