# Panduan Lengkap Migrasi KaloriKu ke MySQL di cPanel

Dokumen ini adalah panduan langkah demi langkah untuk mengaktifkan database **MySQL / MariaDB** pada aplikasi **KaloriKu** di hosting cPanel, sekaligus memindahkan data yang sudah ada di SQLite ke MySQL tanpa ada data yang hilang.

---

## 1. Buat Database & User MySQL di cPanel

1. Masuk ke **cPanel** akun hosting Anda.
2. Pada kolom pencarian, ketik dan klik **MySQL Databases** (atau **Basis Data MySQL**).
3. **Buat Database Baru**:
   - Di bagian *Create New Database* / *Buat Basis Data Baru*, masukkan nama: `kalori` (hasil lengkapnya misal: `bimaprat_kalori`).
   - Klik **Create Database**.
4. **Buat Pengguna MySQL Baru**:
   - Scroll ke bawah ke bagian *Add New User* / *Tambah Pengguna Baru*.
   - Username: `kalori` (hasil lengkapnya misal: `bimaprat_kalori`).
   - Password: Buat password yang kuat (misal: gunakan *Password Generator*), **catat password ini**.
   - Klik **Create User**.
5. **Hubungkan User ke Database**:
   - Scroll ke bagian *Add User To Database* / *Tambahkan Pengguna Ke Basis Data*.
   - Pilih Pengguna: `bimaprat_kalori`.
   - Pilih Basis Data: `bimaprat_kalori`.
   - Klik **Add** / **Tambah**.
   - Centang **ALL PRIVILEGES** (Semua Hak Akses), lalu klik **Make Changes**.

---

## 2. Aktifkan Branch `mysql` di Server cPanel

Buka **Terminal** di cPanel:

```bash
cd ~/monitoring-kalori
git fetch origin
git checkout mysql
```

*(Jika terminal meminta token, gunakan URL dengan GitHub Personal Access Token seperti yang dijelaskan sebelumnya)*.

---

## 3. Buat File Konfigurasi Database (`backend/config.php`)

Di folder repository (`~/monitoring-kalori`):

```bash
cp backend/config.sample.php backend/config.php
nano backend/config.php
```

Sesuaikan isinya dengan kredensial yang dibuat di Langkah 1:

```php
<?php
return [
    'DB_DRIVER' => 'mysql',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => 3306,
    'DB_DATABASE' => 'bimaprat_kalori',
    'DB_USERNAME' => 'bimaprat_kalori',
    'DB_PASSWORD' => 'KATA_SANDI_ANDA',
];
```
Simpan dengan menekan `Ctrl + O` lalu `Enter`, kemudian keluar dengan `Ctrl + X`.

---

## 4. Pindahkan Data Lama (SQLite $\rightarrow$ MySQL)

Jalankan perintah migrasi otomatis:

```bash
php backend/migrate_sqlite_to_mysql.php
```

Output yang akan muncul:
```text
=== KaloriKu: Migrasi Data SQLite -> MySQL ===

1. Membaca sumber SQLite: storage/monitoring_kalori.sqlite
2. Menghubungkan ke target MySQL...
   ✓ Terhubung ke MySQL database: bimaprat_kalori
3. Menyalin data ke MySQL...
  - Tabel `roles`: 2 baris berhasil disalin.
  - Tabel `users`: X baris berhasil disalin.
  - Tabel `app_settings`: X baris berhasil disalin.
  - Tabel `user_profile`: X baris berhasil disalin.
  - Tabel `foods`: 120 baris berhasil disalin.
  - Tabel `activities`: 25 baris berhasil disalin.
  - Tabel `food_logs`: X baris berhasil disalin.
  - Tabel `weight_logs`: X baris berhasil disalin.

🎉 MIGRASI SUKSES!
```

---

## 5. Jalankan `deploy.sh`

Jalankan skrip deploy agar folder web publik (`~/public_html/kalori`) tersinkronisasi:

```bash
bash deploy.sh
```

Aplikasi sekarang sudah berjalan penuh menggunakan **MySQL InnoDB**!

---

## 6. Verifikasi di phpMyAdmin

1. Di menu cPanel, klik **phpMyAdmin**.
2. Klik nama database Anda di sebelah kiri (misal: `bimaprat_kalori`).
3. Anda akan melihat seluruh **12 tabel** dengan tipe engine **InnoDB** dan seluruh data akun, profil, dan catatan makanan yang berhasil dipindahkan.
