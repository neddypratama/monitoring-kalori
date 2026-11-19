<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once dirname(__DIR__, 2) . '/backend/Config.php';

echo "Running ConfigTest...\n";

Assert::test('defaults to sqlite driver when no mysql config is present', function () {
    Config::reset();
    Assert::equals('sqlite', Config::getDriver());
    Assert::true(Config::isSqlite());
    Assert::true(!Config::isMySql());
});

Assert::test('supports mysql driver override via array', function () {
    Config::load([
        'DB_DRIVER' => 'mysql',
        'DB_HOST' => '127.0.0.1',
        'DB_PORT' => 3306,
        'DB_DATABASE' => 'kalori_db',
        'DB_USERNAME' => 'kalori_user',
        'DB_PASSWORD' => 'secret123',
    ]);

    Assert::equals('mysql', Config::getDriver());
    Assert::true(Config::isMySql());
    Assert::true(!Config::isSqlite());
    Assert::equals('127.0.0.1', Config::get('DB_HOST'));
    Assert::equals(3306, Config::getInt('DB_PORT'));
    Assert::equals('kalori_db', Config::get('DB_DATABASE'));
    Assert::equals('kalori_user', Config::get('DB_USERNAME'));
    Assert::equals('secret123', Config::get('DB_PASSWORD'));
    Assert::equals('mysql:host=127.0.0.1;port=3306;dbname=kalori_db;charset=utf8mb4', Config::getMySqlDsn());
});

Assert::test('auto-detects mysql driver when DB_HOST and DB_DATABASE are set', function () {
    Config::load([
        'DB_HOST' => 'localhost',
        'DB_DATABASE' => 'my_prod_db',
        'DB_USERNAME' => 'root',
        'DB_PASSWORD' => '',
    ]);

    Assert::equals('mysql', Config::getDriver());
    Assert::true(Config::isMySql());
});

Assert::summary('ConfigTest');
