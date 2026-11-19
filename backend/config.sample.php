<?php
declare(strict_types=1);

/**
 * KaloriKu Database Configuration Template
 * 
 * Salin file ini menjadi `backend/config.php` lalu sesuaikan dengan kredensial database Anda.
 * Jika file `backend/config.php` tidak ada, sistem akan otomatis menggunakan SQLite (`storage/monitoring_kalori.sqlite`).
 */
return [
    // Driver: 'mysql' untuk MySQL/MariaDB cPanel & Laragon, atau 'sqlite'
    'DB_DRIVER' => 'mysql',

    // Pengaturan MySQL (Sesuaikan dengan Database yang dibuat di cPanel MySQL Databases)
    'DB_HOST' => '127.0.0.1',        // Di cPanel biasanya 'localhost' atau '127.0.0.1'
    'DB_PORT' => 3306,
    'DB_DATABASE' => 'bimaprat_kalori', // Nama database cPanel (misal: bimaprat_kalori)
    'DB_USERNAME' => 'bimaprat_kalori', // Username database cPanel
    'DB_PASSWORD' => 'KATA_SANDI_ANDA', // Password database cPanel
    
    // Opsional jika hosting cPanel memerlukan unix socket:
    // 'DB_SOCKET' => '/var/lib/mysql/mysql.sock',
];
