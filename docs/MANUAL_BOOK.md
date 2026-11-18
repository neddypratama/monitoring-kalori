<<<<<<< HEAD
# Manual Book — KaloriKu (Sistem Monitoring Kalori & Program Diet)

Panduan lengkap penggunaan aplikasi web **KaloriKu** untuk pengguna harian (*User*) maupun pengelola sistem (*Admin*).

---

## Daftar Isi
1. [Tentang KaloriKu](#1-tentang-kaloriku)
2. [Cara Menjalankan Aplikasi](#2-cara-menjalankan-aplikasi)
3. [Masuk (Login) & Daftar Akun (Register)](#3-masuk-login--daftar-akun-register)
4. [Pengaturan Profil Awal (Onboarding)](#4-pengaturan-profil-awal-onboarding)
5. [Panduan Penggunaan Harian (User)](#5-panduan-penggunaan-harian-user)
   - [5.1 Memahami Dashboard & Evaluasi Kalori vs BB](#51-memahami-dashboard--evaluasi-kalori-vs-bb)
   - [5.2 Mencatat Makanan (Katalog Lokal, Open Food Facts, & Manual)](#52-mencatat-makanan-katalog-lokal-open-food-facts--manual)
   - [5.3 Mencatat Olahraga & Aktivitas (Jarak & Durasi)](#53-mencatat-olahraga--aktivitas-jarak--durasi)
   - [5.4 Mencatat Berat Badan Harian](#54-mencatat-berat-badan-harian)
   - [5.5 Catatan Harian (Lihat, Edit, & Hapus)](#55-catatan-harian-lihat-edit--hapus)
   - [5.6 Mengelola Katalog Makanan & Aktivitas](#56-mengelola-katalog-makanan--aktivitas)
   - [5.7 Profil, Target Kalori, Ubah Password, & Backup JSON](#57-profil-target-kalori-ubah-password--backup-json)
6. [Panduan Panel Admin (RBAC & Audit Log)](#6-panduan-panel-admin-rbac--audit-log)
   - [6.1 Kelola User & Pantau Progres Diet](#61-kelola-user--pantau-progres-diet)
   - [6.2 Kelola Role & Hak Akses](#62-kelola-role--hak-akses)
   - [6.3 Log Aktivitas Sistem (Audit Log)](#63-log-aktivitas-sistem-audit-log)
7. [Penjelasan Rumus Perhitungan](#7-penjelasan-rumus-perhitungan)
8. [Pemecahan Masalah (Troubleshooting) & FAQ](#8-pemecahan-masalah-troubleshooting--faq)

---

## 1. Tentang KaloriKu

**KaloriKu** adalah aplikasi web untuk memantau **kalori masuk** (makanan & minuman), **kalori keluar** (olahraga & aktivitas harian), serta **perkembangan berat badan (BB) harian** bergaya program diet.

Fitur utama yang tersedia:
- **Auto-Hitung Kalori Makanan:** Dilengkapi 132 katalog makanan & minuman Indonesia/umum, pencarian online produk kemasan via **Open Food Facts**, serta input manual & katalog pribadi.
- **Auto-Hitung Kalori Aktivitas (Jarak & Durasi):** Dilengkapi 29 aktivitas berbasis standar ilmiah MET yang mendukung input **meter (`m`)**, **kilometer (`km`)**, maupun **menit** (contoh: *Jalan Santai 500 m* langsung terhitung otomatis berdasarkan berat badan terkini).
- **Korelasi Kalori vs Berat Badan:** Membandingkan perubahan BB aktual terhadap proyeksi teoritis dari akumulasi defisit/surplus kalori (`1 kg ≈ 7.700 kkal`).
- **Multi-User, RBAC, & Audit Log:** Setiap akun memiliki data diet terisolasi (`user_id`), dengan panel Admin untuk mengelola user, membuat role kustom, memantau progres diet user lain, dan melihat log sistem.

---

## 2. Cara Menjalankan Aplikasi

Aplikasi ini berjalan menggunakan **PHP 8.3 + SQLite** tanpa perlu membuat database MySQL secara manual. Pada akses pertama, file database `storage/monitoring_kalori.sqlite`, tabel, role bawaan, akun Admin awal, dan katalog makanan/aktivitas otomatis dibuat.

### Opsi A — Via Laragon (Disarankan untuk Pemakaian Harian)
1. Pastikan **Laragon** dalam keadaan aktif (*Start All* — Apache/Nginx aktif).
2. Buka browser (Chrome / Edge / Firefox) lalu kunjungi salah satu alamat berikut:
   - `http://monitoring-kalori.test/` *(virtual host otomatis Laragon)*
   - `http://localhost/monitoring-kalori/` *(akses langsung via folder `www`)*

### Opsi B — Via PHP Built-in Server (Alternatif Cepat)
1. Buka Terminal / PowerShell di folder proyek `c:\laragon\www\monitoring-kalori`.
2. Jalankan perintah:
   ```powershell
   php -S 127.0.0.1:8000
   ```
3. Buka browser dan kunjungi `http://127.0.0.1:8000/`.

> **Catatan Pengembang:** Jika Anda memodifikasi kode tampilan di folder `frontend/`, jalankan `npm run build` di dalam folder `frontend/` agar hasil build terbaru tersimpan ke folder `dist/`.

---

## 3. Masuk (Login) & Daftar Akun (Register)

Saat membuka aplikasi pertama kali (atau setelah keluar), Anda akan melihat halaman **Masuk Akun / Daftar Baru**.

### A. Masuk sebagai Admin Awal
Sistem secara otomatis membuat 1 akun Administrator bawaan:
- **Username:** `admin`
- **Password:** `admin123`

> **Penting:** Segera ubah password bawaan ini setelah masuk melalui menu **Profil & Diet → Keamanan Akun — Ubah Password**.

### B. Daftar Akun Baru (User Mandiri)
1. Klik tab **Daftar Baru**.
2. Isi **Nama Lengkap**, **Username** (3–32 karakter: huruf, angka, titik, `_`, atau `-`), **Password** (minimal 6 karakter), dan **Ulangi Password**.
3. Klik **Daftar & Mulai**. Akun baru otomatis mendapat role `user` dan langsung masuk ke tahap pengaturan profil awal.

### C. Keluar dari Akun (Logout)
Klik tombol **Keluar** di pojok kiri bawah sidebar (desktop) atau ikon keluar di pojok kanan atas (mobile).

---

## 4. Pengaturan Profil Awal (Onboarding)

Setiap pengguna yang baru pertama kali masuk akan diminta melengkapi profil singkat 1 layar:
1. **Nama Panggilan** *(opsional)*.
2. **Berat Badan Saat Ini (kg)** dan **Tinggi Badan (cm)** — mendukung koma maupun titik desimal (misal `70,5` atau `70.5`).
3. **Usia (tahun)** dan **Jenis Kelamin** (`Laki-laki` / `Perempuan`).
4. **Tujuan Program Diet:**
   - **Turun Berat Badan:** target defisit ~500 kkal/hari (dengan batas aman minimal 1.200 kkal perempuan / 1.500 kkal laki-laki).
   - **Jaga Berat Badan:** target setara TDEE.
   - **Naik Berat Badan:** target surplus ringan ~300 kkal/hari.
5. **Target Berat Badan (kg)** *(opsional — tampil sebagai garis target di grafik)*.
6. **Tingkat Aktivitas Harian:** Disarankan memilih **Sedentari (1.2)** jika Anda berencana rutin mencatat jalan kaki dan olahraga secara terpisah agar pembakaran kalori tidak terhitung ganda.

Panel gelap di sebelah kanan menampilkan pratinjau langsung **Rekomendasi Target Kalori**, **BMI (Kemenkes RI)**, **BMR**, dan **TDEE**. Klik **Mulai Program Diet** untuk menyimpan — berat badan awal Anda juga otomatis dicatat sebagai entri pertama grafik BB harian.

---

## 5. Panduan Penggunaan Harian (User)

### 5.1 Memahami Dashboard & Evaluasi Kalori vs BB
Menu **Dashboard** menampilkan gambaran program diet Anda dalam sekali pandang:
- **Tombol Cepat:** **Catat Makan**, **Catat Aktivitas**, dan **Catat Berat Badan** tersedia di bagian atas Dashboard maupun di sidebar kiri.
- **Kartu Ringkasan Hari Ini:**
  - *Kalori Masuk Hari Ini:* Lingkaran progres terhadap kuota harian (`Target Harian + Kalori Aktivitas`) serta sisa kuota kalori.
  - *Kalori Keluar Aktivitas:* Total kalori terbakar dari olahraga/aktivitas hari ini dan total pengeluaran harian (`TDEE + Olahraga`).
  - *Berat Badan Terkini:* Angka BB terakhir, selisih dari BB awal, dan lencana kategori **BMI Kemenkes RI**.
  - *Ringkasan Makro Hari Ini:* Distribusi gram Protein, Karbohidrat, dan Lemak.
- **Kartu Evaluasi Program Diet (Kalori vs BB):**
  - Pilih rentang evaluasi: `7 Hari`, `14 Hari`, `30 Hari`, atau `Semua`.
  - Membandingkan **Perubahan BB Aktual** vs **Estimasi Teoritis dari Kalori** hanya pada hari-hari yang memiliki catatan makanan di dalam rentang tanggal penimbangan (hari lupa catat tidak memicu defisit palsu).
  - Arti 4 status evaluasi:
    - **Mengumpulkan Data:** Data masih kurang dari minimal 3 hari penimbangan BB atau 3 hari catatan makan dalam rentang penimbangan.
    - **Sesuai Jalur:** Selisih BB aktual dan estimasi teoritis berada dalam batas konsistensi wajar (`±0,5 kg`).
    - **Turun Lebih Cepat dari Estimasi:** Penurunan aktual >0,5 kg lebih cepat dari estimasi (bisa karena aktivitas harian non-olahraga tinggi atau fluktuasi cairan).
    - **Lebih Lambat dari Estimasi:** Perubahan aktual >0,5 kg di atas estimasi (disarankan cek ketepatan porsi, camilan/minuman yang belum tercatat, atau retensi air normal).
- **Dua Grafik Interaktif:**
  - *Tren Berat Badan vs Proyeksi Kalori:* Garis BB Aktual (indigo), Rata-rata 7 Hari (abu-abu putus-putus), Proyeksi Teoritis dari kalori (hijau), dan garis Target BB (kuning).
  - *Kalori Masuk vs Kalori Keluar Harian:* Batang kalori masuk (hijau), kalori aktivitas (kuning), dan garis target harian.

### 5.2 Mencatat Makanan (Katalog Lokal, Open Food Facts, & Manual)
Klik **Catat Makan**, tentukan **Tanggal** dan **Waktu Makan** (`Sarapan`, `Makan Siang`, `Makan Malam`, atau `Camilan`), lalu pilih salah satu dari 3 tab:
1. **Tab Katalog (Lokal):**
   - Ketik nama makanan (misal: *nasi putih*, *ayam bakar*, *tempe goreng*, *es teh manis*). Item favorit selalu muncul paling atas.
   - Klik item, lalu isi **Jumlah** (misal `1,5`) dan pilih satuan standar (`piring`/`potong`/`gelas`) atau `gram`.
   - Lihat **Estimasi Otomatis** kalori & makro, lalu klik **Simpan Makanan**.
2. **Tab Cari Online (Open Food Facts):**
   - Cocok untuk produk kemasan/bermerek (misal: *Indomie*, *Ultra Milk*, *Milo*, *Fitbar*).
   - Ketik nama produk lalu klik **Cari** (membutuhkan koneksi internet).
   - Pilih produk dari hasil pencarian, atur jumlah & satuan (`porsi`/`bungkus`/`gelas` atau `gram`).
   - Biarkan centang **"Simpan juga ke katalog pribadi"** aktif agar produk tersebut tersimpan lokal untuk dipakai offline lain kali, lalu klik **Simpan Makanan**.
3. **Tab Manual:**
   - Isi nama makanan, total kalori, jumlah, dan satuan secara bebas.
   - Centang **"Simpan ke katalog pribadi"** jika ingin menyimpannya agar bisa auto-hitung di kemudian hari.

### 5.3 Mencatat Olahraga & Aktivitas (Jarak & Durasi)
Klik **Catat Aktivitas**, pilih tanggal, lalu:
1. Pada tab **Katalog**, cari aktivitas (misal: *Jalan Santai*, *Jalan Cepat*, *Jogging*, *Bersepeda Santai*, *Gym*, *Badminton*, *Yoga*).
2. Untuk aktivitas berbasis jarak (`Jalan`, `Lari`, `Bersepeda`, `Berenang`), Anda dapat memilih satuan **`meter`**, **`km`**, atau **`menit`**.
   - *Contoh:* Pilih **Jalan Santai**, pilih satuan **`meter`**, masukkan **`500`** → sistem otomatis mengonversi ke estimasi durasi dan menghitung kalori terbakar sesuai berat badan terkini Anda.
3. Untuk aktivitas non-jarak (seperti *Yoga*, *Angkat Beban*, *Badminton*), masukkan durasi dalam **`menit`**.
4. Gunakan tab **Manual** jika ingin memasukkan angka kalori terbakar sendiri (misal hasil bacaan smartwatch).

### 5.4 Mencatat Berat Badan Harian
1. Klik **Catat Berat Badan**.
2. Pilih tanggal penimbangan, masukkan angka **Berat Badan (kg)** (boleh pakai koma, misal `68,4`), dan catatan singkat opsional (misal: *pagi setelah bangun*).
3. Jika tanggal tersebut sudah pernah dicatat sebelumnya, nilai lama akan **otomatis diperbarui** (1 catatan per hari).
4. **Tips:** Timbang di waktu yang konsisten (misalnya pagi setelah bangun dan buang air, sebelum sarapan) agar grafik tren lebih akurat.

### 5.5 Catatan Harian (Lihat, Edit, & Hapus)
Buka menu **Catatan Harian**:
- Gunakan panah `<` / `>`, pemilih tanggal, atau tombol **Hari Ini** untuk meninjau hari mana pun.
- Makanan dikelompokkan berdasarkan **Sarapan, Makan Siang, Makan Malam, dan Camilan** lengkap dengan tombol **+ Tambah** per kategori.
- Klik ikon **pensil** untuk mengedit catatan, atau klik ikon **tempat sampah** 2 kali (konfirmasi cepat `Hapus?`) untuk menghapus catatan.

### 5.6 Mengelola Katalog Makanan & Aktivitas
Buka menu **Katalog**:
- Beralih antara tab **Makanan** dan **Aktivitas**, saring berdasarkan kategori atau filter **Favorit**.
- Klik ikon **bintang** pada item mana pun untuk menjadikannya favorit (hanya berlaku untuk akun Anda sendiri).
- Klik **Cari Open Food Facts** (pada tab Makanan) untuk mengimpor produk kemasan langsung ke katalog pribadi.
- Klik **Tambah Makanan Kustom** / **Tambah Aktivitas Kustom** untuk menambahkan item buatan sendiri. Hanya item bertanda **Kustom** milik Anda yang dapat diedit atau dihapus (menghapus item kustom **tidak merusak** catatan harian lama).

### 5.7 Profil, Target Kalori, Ubah Password, & Backup JSON
Buka menu **Profil & Diet**:
- **Pengaturan Profil & Target Kalori:** Ubah tinggi badan, usia, tingkat aktivitas, tujuan diet, atau target BB. Secara default target kalori mengikuti perhitungan otomatis berdasarkan BB terkini; centang **Atur Manual** jika ingin menetapkan angka target kalori sendiri.
- **Riwayat Berat Badan:** Lihat seluruh daftar penimbangan Anda dan hapus entri bila salah input.
- **Keamanan Akun — Ubah Password:** Masukkan password saat ini dan password baru (min. 6 karakter), lalu klik **Ubah Password**.
- **Ekspor Cadangan (JSON):** Klik tombol di pojok kanan atas untuk mengunduh file `.json` berisi seluruh profil, katalog kustom, dan catatan kalori/aktivitas/BB akun Anda.

---

## 6. Panduan Panel Admin (RBAC & Audit Log)

Menu **Panel Admin** otomatis muncul di sidebar bagi pengguna yang role-nya memiliki izin administratif (seperti role bawaan `admin`).

### 6.1 Kelola User & Pantau Progres Diet
Buka menu **Kelola User**:
- **Tabel Ringkasan:** Menampilkan seluruh akun beserta role, status Aktif/Nonaktif, BB terkini, kalori masuk & keluar hari ini, serta total catatan masing-masing user.
- **Tambah User:** Klik **Tambah User**, isi nama lengkap, username, password, pilih role, dan status aktif.
- **Pantau Diet User:** Klik tombol **Pantau** pada baris user mana pun untuk membuka modal pemantauan progres kalori hari ini, berat badan & BMI, status evaluasi diet (`7 / 14 / 30 Hari / Semua`), serta 15 catatan makanan, aktivitas, dan BB terbaru user tersebut.
- **Edit / Reset Password / Nonaktifkan / Hapus:** Klik ikon **pensil** untuk mengubah data, mengganti role, menonaktifkan akun, atau mengisi kolom password baru untuk mereset password user. *(Sistem melindungi agar Admin tidak bisa menghapus/menonaktifkan dirinya sendiri maupun Admin aktif terakhir.)*

### 6.2 Kelola Role & Hak Akses
Buka menu **Kelola Role**:
- Role bawaan **`admin`** dan **`user`** terlindungi dan tidak dapat dihapus.
- Klik **Tambah Role** untuk membuat role kustom (misalnya `coach` atau `nutrisionis`), lalu centang kombinasi 4 hak akses sesuai kebutuhan:
  1. **Kelola User** — tambah, edit, reset password, nonaktifkan, dan hapus akun.
  2. **Kelola Role & Hak Akses** — buat, ubah, dan hapus role kustom.
  3. **Pantau Data Kalori & Berat Badan Semua User** — membuka tombol **Pantau** di daftar user.
  4. **Lihat Log Aktivitas Sistem (Audit Log)** — mengakses menu **Log Sistem**.

### 6.3 Log Aktivitas Sistem (Audit Log)
Buka menu **Log Sistem**:
- Setiap kejadian penting (login, register, logout, ubah password, simpan profil, tambah/edit/hapus makanan, aktivitas, BB, katalog kustom, serta pengelolaan user & role) tercatat otomatis lengkap dengan waktu, `username` + `user_id`, jenis aksi, dan detailnya.
- Gunakan kolom **pencarian**, filter **User**, dan filter **Aksi**, serta tombol **Muat Ulang** untuk memantau aktivitas terbaru.

---

## 7. Penjelasan Rumus Perhitungan

| Komponen | Rumus / Standar yang Digunakan |
| --- | --- |
| **BMI (Kemenkes RI)** | $\text{BB (kg)} / (\text{TB (m)})^2$ — `<18,5` Kurang, `18,5–25,0` Normal, `25,1–27,0` Gemuk Ringan, `>27,0` Obesitas |
| **BMR (Mifflin-St Jeor)** | Laki-laki: $10\text{BB} + 6{,}25\text{TB} - 5\text{Usia} + 5$ ; Perempuan: $10\text{BB} + 6{,}25\text{TB} - 5\text{Usia} - 161$ |
| **TDEE (Baseline Harian)** | $\text{BMR} \times \text{Faktor}$ (`1,2` Sedentari, `1,375` Ringan, `1,55` Sedang, `1,725` Aktif), dihitung dinamis memakai BB efektif per tanggal |
| **Kalori Makanan** | $(\text{gram} / 100) \times \text{kkal per 100 g}$ (untuk satuan porsi, $\text{gram} = \text{jumlah} \times \text{gram per porsi}$) |
| **Kalori Aktivitas (MET)** | $\text{round}((\text{MET} \times 3{,}5 \times \text{BB (kg)} / 200) \times \text{durasi menit})$. Untuk input jarak (`m`/`km`), durasi diestimasi dari kecepatan rata-rata aktivitas |
| **Proyeksi Perubahan BB** | $\text{Akumulasi Keseimbangan Kalori} / 7.700$ (`1 kg ≈ 7.700 kkal`), batas konsistensi evaluasi `±0,5 kg` |

---

## 8. Pemecahan Masalah (Troubleshooting) & FAQ

- **Saya mengetik angka pakai koma (misal `68,5` atau `1,5`), apakah terbaca?**  
  Ya. Seluruh kolom angka berat badan, tinggi badan, porsi, jarak, dan kalori mendukung koma (`,`) maupun titik (`.`).
- **Pencarian Open Food Facts gagal atau muncul pesan koneksi?**  
  Pastikan komputer terhubung ke internet (fitur ini mengakses `search.openfoodfacts.org`). Katalog lokal 132 makanan Indonesia dan input manual tetap berjalan 100% offline.
- **Di mana file database disimpan jika saya ingin mem-backup seluruh sistem?**  
  Seluruh data multi-user tersimpan dalam 1 file SQLite: `storage/monitoring_kalori.sqlite`. Cukup salin file tersebut untuk backup penuh server, atau gunakan tombol **Ekspor Cadangan (JSON)** di halaman Profil untuk backup per akun.
- **Bagaimana jika saya lupa password user biasa?**  
  Minta Admin masuk ke **Kelola User → Edit** pada akun Anda lalu isi kolom **Password** baru untuk meresetnya.
- **Halaman muncul pesan "KaloriKu belum dibuild"?**  
  Jalankan perintah berikut di folder proyek:
  ```powershell
  cd frontend
  npm install
  npm run build
  ```
=======
# Manual Book — KaloriKu (Sistem Monitoring Kalori & Program Diet)

Panduan lengkap penggunaan aplikasi web **KaloriKu** untuk pengguna harian (*User*) maupun pengelola sistem (*Admin*).

---

## Daftar Isi
1. [Tentang KaloriKu](#1-tentang-kaloriku)
2. [Cara Menjalankan Aplikasi](#2-cara-menjalankan-aplikasi)
3. [Masuk (Login) & Daftar Akun (Register)](#3-masuk-login--daftar-akun-register)
4. [Pengaturan Profil Awal (Onboarding)](#4-pengaturan-profil-awal-onboarding)
5. [Panduan Penggunaan Harian (User)](#5-panduan-penggunaan-harian-user)
   - [5.1 Memahami Dashboard & Evaluasi Kalori vs BB](#51-memahami-dashboard--evaluasi-kalori-vs-bb)
   - [5.2 Mencatat Makanan (Katalog Lokal, Open Food Facts, & Manual)](#52-mencatat-makanan-katalog-lokal-open-food-facts--manual)
   - [5.3 Mencatat Olahraga & Aktivitas (Jarak & Durasi)](#53-mencatat-olahraga--aktivitas-jarak--durasi)
   - [5.4 Mencatat Berat Badan Harian](#54-mencatat-berat-badan-harian)
   - [5.5 Catatan Harian (Lihat, Edit, & Hapus)](#55-catatan-harian-lihat-edit--hapus)
   - [5.6 Mengelola Katalog Makanan & Aktivitas](#56-mengelola-katalog-makanan--aktivitas)
   - [5.7 Profil, Target Kalori, Ubah Password, & Backup JSON](#57-profil-target-kalori-ubah-password--backup-json)
6. [Panduan Panel Admin (RBAC & Audit Log)](#6-panduan-panel-admin-rbac--audit-log)
   - [6.1 Kelola User & Pantau Progres Diet](#61-kelola-user--pantau-progres-diet)
   - [6.2 Kelola Role & Hak Akses](#62-kelola-role--hak-akses)
   - [6.3 Log Aktivitas Sistem (Audit Log)](#63-log-aktivitas-sistem-audit-log)
7. [Penjelasan Rumus Perhitungan](#7-penjelasan-rumus-perhitungan)
8. [Pemecahan Masalah (Troubleshooting) & FAQ](#8-pemecahan-masalah-troubleshooting--faq)

---

## 1. Tentang KaloriKu

**KaloriKu** adalah aplikasi web untuk memantau **kalori masuk** (makanan & minuman), **kalori keluar** (olahraga & aktivitas harian), serta **perkembangan berat badan (BB) harian** bergaya program diet.

Fitur utama yang tersedia:
- **Auto-Hitung Kalori Makanan:** Dilengkapi 132 katalog makanan & minuman Indonesia/umum, pencarian online produk kemasan via **Open Food Facts**, serta input manual & katalog pribadi.
- **Auto-Hitung Kalori Aktivitas (Jarak & Durasi):** Dilengkapi 29 aktivitas berbasis standar ilmiah MET yang mendukung input **meter (`m`)**, **kilometer (`km`)**, maupun **menit** (contoh: *Jalan Santai 500 m* langsung terhitung otomatis berdasarkan berat badan terkini).
- **Korelasi Kalori vs Berat Badan:** Membandingkan perubahan BB aktual terhadap proyeksi teoritis dari akumulasi defisit/surplus kalori (`1 kg ≈ 7.700 kkal`).
- **Multi-User, RBAC, & Audit Log:** Setiap akun memiliki data diet terisolasi (`user_id`), dengan panel Admin untuk mengelola user, membuat role kustom, memantau progres diet user lain, dan melihat log sistem.

---

## 2. Cara Menjalankan Aplikasi

Aplikasi ini berjalan menggunakan **PHP 8.3 + SQLite** tanpa perlu membuat database MySQL secara manual. Pada akses pertama, file database `storage/monitoring_kalori.sqlite`, tabel, role bawaan, akun Admin awal, dan katalog makanan/aktivitas otomatis dibuat.

### Opsi A — Via Laragon (Disarankan untuk Pemakaian Harian)
1. Pastikan **Laragon** dalam keadaan aktif (*Start All* — Apache/Nginx aktif).
2. Buka browser (Chrome / Edge / Firefox) lalu kunjungi salah satu alamat berikut:
   - `http://monitoring-kalori.test/` *(virtual host otomatis Laragon)*
   - `http://localhost/monitoring-kalori/` *(akses langsung via folder `www`)*

### Opsi B — Via PHP Built-in Server (Alternatif Cepat)
1. Buka Terminal / PowerShell di folder proyek `c:\laragon\www\monitoring-kalori`.
2. Jalankan perintah:
   ```powershell
   php -S 127.0.0.1:8000
   ```
3. Buka browser dan kunjungi `http://127.0.0.1:8000/`.

> **Catatan Pengembang:** Jika Anda memodifikasi kode tampilan di folder `frontend/`, jalankan `npm run build` di dalam folder `frontend/` agar hasil build terbaru tersimpan ke folder `dist/`.

---

## 3. Masuk (Login) & Daftar Akun (Register)

Saat membuka aplikasi pertama kali (atau setelah keluar), Anda akan melihat halaman **Masuk Akun / Daftar Baru**.

### A. Masuk sebagai Admin Awal
Sistem secara otomatis membuat 1 akun Administrator bawaan:
- **Username:** `admin`
- **Password:** `admin123`

> **Penting:** Segera ubah password bawaan ini setelah masuk melalui menu **Profil & Diet → Keamanan Akun — Ubah Password**.

### B. Daftar Akun Baru (User Mandiri)
1. Klik tab **Daftar Baru**.
2. Isi **Nama Lengkap**, **Username** (3–32 karakter: huruf, angka, titik, `_`, atau `-`), **Password** (minimal 6 karakter), dan **Ulangi Password**.
3. Klik **Daftar & Mulai**. Akun baru otomatis mendapat role `user` dan langsung masuk ke tahap pengaturan profil awal.

### C. Keluar dari Akun (Logout)
Klik tombol **Keluar** di pojok kiri bawah sidebar (desktop) atau ikon keluar di pojok kanan atas (mobile).

---

## 4. Pengaturan Profil Awal (Onboarding)

Setiap pengguna yang baru pertama kali masuk akan diminta melengkapi profil singkat 1 layar:
1. **Nama Panggilan** *(opsional)*.
2. **Berat Badan Saat Ini (kg)** dan **Tinggi Badan (cm)** — mendukung koma maupun titik desimal (misal `70,5` atau `70.5`).
3. **Usia (tahun)** dan **Jenis Kelamin** (`Laki-laki` / `Perempuan`).
4. **Tujuan Program Diet:**
   - **Turun Berat Badan:** target defisit ~500 kkal/hari (dengan batas aman minimal 1.200 kkal perempuan / 1.500 kkal laki-laki).
   - **Jaga Berat Badan:** target setara TDEE.
   - **Naik Berat Badan:** target surplus ringan ~300 kkal/hari.
5. **Target Berat Badan (kg)** *(opsional — tampil sebagai garis target di grafik)*.
6. **Tingkat Aktivitas Harian:** Disarankan memilih **Sedentari (1.2)** jika Anda berencana rutin mencatat jalan kaki dan olahraga secara terpisah agar pembakaran kalori tidak terhitung ganda.

Panel gelap di sebelah kanan menampilkan pratinjau langsung **Rekomendasi Target Kalori**, **BMI (Kemenkes RI)**, **BMR**, dan **TDEE**. Klik **Mulai Program Diet** untuk menyimpan — berat badan awal Anda juga otomatis dicatat sebagai entri pertama grafik BB harian.

---

## 5. Panduan Penggunaan Harian (User)

### 5.1 Memahami Dashboard & Evaluasi Kalori vs BB
Menu **Dashboard** menampilkan gambaran program diet Anda dalam sekali pandang:
- **Tombol Cepat:** **Catat Makan**, **Catat Aktivitas**, dan **Catat Berat Badan** tersedia di bagian atas Dashboard maupun di sidebar kiri.
- **Kartu Ringkasan Hari Ini:**
  - *Kalori Masuk Hari Ini:* Lingkaran progres terhadap kuota harian (`Target Harian + Kalori Aktivitas`) serta sisa kuota kalori.
  - *Kalori Keluar Aktivitas:* Total kalori terbakar dari olahraga/aktivitas hari ini dan total pengeluaran harian (`TDEE + Olahraga`).
  - *Berat Badan Terkini:* Angka BB terakhir, selisih dari BB awal, dan lencana kategori **BMI Kemenkes RI**.
  - *Ringkasan Makro Hari Ini:* Distribusi gram Protein, Karbohidrat, dan Lemak.
- **Kartu Evaluasi Program Diet (Kalori vs BB):**
  - Pilih rentang evaluasi: `7 Hari`, `14 Hari`, `30 Hari`, atau `Semua`.
  - Membandingkan **Perubahan BB Aktual** vs **Estimasi Teoritis dari Kalori** hanya pada hari-hari yang memiliki catatan makanan di dalam rentang tanggal penimbangan (hari lupa catat tidak memicu defisit palsu).
  - Arti 4 status evaluasi:
    - **Mengumpulkan Data:** Data masih kurang dari minimal 3 hari penimbangan BB atau 3 hari catatan makan dalam rentang penimbangan.
    - **Sesuai Jalur:** Selisih BB aktual dan estimasi teoritis berada dalam batas konsistensi wajar (`±0,5 kg`).
    - **Turun Lebih Cepat dari Estimasi:** Penurunan aktual >0,5 kg lebih cepat dari estimasi (bisa karena aktivitas harian non-olahraga tinggi atau fluktuasi cairan).
    - **Lebih Lambat dari Estimasi:** Perubahan aktual >0,5 kg di atas estimasi (disarankan cek ketepatan porsi, camilan/minuman yang belum tercatat, atau retensi air normal).
- **Dua Grafik Interaktif:**
  - *Tren Berat Badan vs Proyeksi Kalori:* Garis BB Aktual (indigo), Rata-rata 7 Hari (abu-abu putus-putus), Proyeksi Teoritis dari kalori (hijau), dan garis Target BB (kuning).
  - *Kalori Masuk vs Kalori Keluar Harian:* Batang kalori masuk (hijau), kalori aktivitas (kuning), dan garis target harian.

### 5.2 Mencatat Makanan (Katalog Lokal, Open Food Facts, & Manual)
Klik **Catat Makan**, tentukan **Tanggal** dan **Waktu Makan** (`Sarapan`, `Makan Siang`, `Makan Malam`, atau `Camilan`), lalu pilih salah satu dari 3 tab:
1. **Tab Katalog (Lokal):**
   - Ketik nama makanan (misal: *nasi putih*, *ayam bakar*, *tempe goreng*, *es teh manis*). Item favorit selalu muncul paling atas.
   - Klik item, lalu isi **Jumlah** (misal `1,5`) dan pilih satuan standar (`piring`/`potong`/`gelas`) atau `gram`.
   - Lihat **Estimasi Otomatis** kalori & makro, lalu klik **Simpan Makanan**.
2. **Tab Cari Online (Open Food Facts):**
   - Cocok untuk produk kemasan/bermerek (misal: *Indomie*, *Ultra Milk*, *Milo*, *Fitbar*).
   - Ketik nama produk lalu klik **Cari** (membutuhkan koneksi internet).
   - Pilih produk dari hasil pencarian, atur jumlah & satuan (`porsi`/`bungkus`/`gelas` atau `gram`).
   - Biarkan centang **"Simpan juga ke katalog pribadi"** aktif agar produk tersebut tersimpan lokal untuk dipakai offline lain kali, lalu klik **Simpan Makanan**.
3. **Tab Manual:**
   - Isi nama makanan, total kalori, jumlah, dan satuan secara bebas.
   - Centang **"Simpan ke katalog pribadi"** jika ingin menyimpannya agar bisa auto-hitung di kemudian hari.

### 5.3 Mencatat Olahraga & Aktivitas (Jarak & Durasi)
Klik **Catat Aktivitas**, pilih tanggal, lalu:
1. Pada tab **Katalog**, cari aktivitas (misal: *Jalan Santai*, *Jalan Cepat*, *Jogging*, *Bersepeda Santai*, *Gym*, *Badminton*, *Yoga*).
2. Untuk aktivitas berbasis jarak (`Jalan`, `Lari`, `Bersepeda`, `Berenang`), Anda dapat memilih satuan **`meter`**, **`km`**, atau **`menit`**.
   - *Contoh:* Pilih **Jalan Santai**, pilih satuan **`meter`**, masukkan **`500`** → sistem otomatis mengonversi ke estimasi durasi dan menghitung kalori terbakar sesuai berat badan terkini Anda.
3. Untuk aktivitas non-jarak (seperti *Yoga*, *Angkat Beban*, *Badminton*), masukkan durasi dalam **`menit`**.
4. Gunakan tab **Manual** jika ingin memasukkan angka kalori terbakar sendiri (misal hasil bacaan smartwatch).

### 5.4 Mencatat Berat Badan Harian
1. Klik **Catat Berat Badan**.
2. Pilih tanggal penimbangan, masukkan angka **Berat Badan (kg)** (boleh pakai koma, misal `68,4`), dan catatan singkat opsional (misal: *pagi setelah bangun*).
3. Jika tanggal tersebut sudah pernah dicatat sebelumnya, nilai lama akan **otomatis diperbarui** (1 catatan per hari).
4. **Tips:** Timbang di waktu yang konsisten (misalnya pagi setelah bangun dan buang air, sebelum sarapan) agar grafik tren lebih akurat.

### 5.5 Catatan Harian (Lihat, Edit, & Hapus)
Buka menu **Catatan Harian**:
- Gunakan panah `<` / `>`, pemilih tanggal, atau tombol **Hari Ini** untuk meninjau hari mana pun.
- Makanan dikelompokkan berdasarkan **Sarapan, Makan Siang, Makan Malam, dan Camilan** lengkap dengan tombol **+ Tambah** per kategori.
- Klik ikon **pensil** untuk mengedit catatan, atau klik ikon **tempat sampah** 2 kali (konfirmasi cepat `Hapus?`) untuk menghapus catatan.

### 5.6 Mengelola Katalog Makanan & Aktivitas
Buka menu **Katalog**:
- Beralih antara tab **Makanan** dan **Aktivitas**, saring berdasarkan kategori atau filter **Favorit**.
- Klik ikon **bintang** pada item mana pun untuk menjadikannya favorit (hanya berlaku untuk akun Anda sendiri).
- Klik **Cari Open Food Facts** (pada tab Makanan) untuk mengimpor produk kemasan langsung ke katalog pribadi.
- Klik **Tambah Makanan Kustom** / **Tambah Aktivitas Kustom** untuk menambahkan item buatan sendiri. Hanya item bertanda **Kustom** milik Anda yang dapat diedit atau dihapus (menghapus item kustom **tidak merusak** catatan harian lama).

### 5.7 Profil, Target Kalori, Ubah Password, & Backup JSON
Buka menu **Profil & Diet**:
- **Pengaturan Profil & Target Kalori:** Ubah tinggi badan, usia, tingkat aktivitas, tujuan diet, atau target BB. Secara default target kalori mengikuti perhitungan otomatis berdasarkan BB terkini; centang **Atur Manual** jika ingin menetapkan angka target kalori sendiri.
- **Riwayat Berat Badan:** Lihat seluruh daftar penimbangan Anda dan hapus entri bila salah input.
- **Keamanan Akun — Ubah Password:** Masukkan password saat ini dan password baru (min. 6 karakter), lalu klik **Ubah Password**.
- **Ekspor Cadangan (JSON):** Klik tombol di pojok kanan atas untuk mengunduh file `.json` berisi seluruh profil, katalog kustom, dan catatan kalori/aktivitas/BB akun Anda.

---

## 6. Panduan Panel Admin (RBAC & Audit Log)

Menu **Panel Admin** otomatis muncul di sidebar bagi pengguna yang role-nya memiliki izin administratif (seperti role bawaan `admin`).

### 6.1 Kelola User & Pantau Progres Diet
Buka menu **Kelola User**:
- **Tabel Ringkasan:** Menampilkan seluruh akun beserta role, status Aktif/Nonaktif, BB terkini, kalori masuk & keluar hari ini, serta total catatan masing-masing user.
- **Tambah User:** Klik **Tambah User**, isi nama lengkap, username, password, pilih role, dan status aktif.
- **Pantau Diet User:** Klik tombol **Pantau** pada baris user mana pun untuk membuka modal pemantauan progres kalori hari ini, berat badan & BMI, status evaluasi diet (`7 / 14 / 30 Hari / Semua`), serta 15 catatan makanan, aktivitas, dan BB terbaru user tersebut.
- **Edit / Reset Password / Nonaktifkan / Hapus:** Klik ikon **pensil** untuk mengubah data, mengganti role, menonaktifkan akun, atau mengisi kolom password baru untuk mereset password user. *(Sistem melindungi agar Admin tidak bisa menghapus/menonaktifkan dirinya sendiri maupun Admin aktif terakhir.)*

### 6.2 Kelola Role & Hak Akses
Buka menu **Kelola Role**:
- Role bawaan **`admin`** dan **`user`** terlindungi dan tidak dapat dihapus.
- Klik **Tambah Role** untuk membuat role kustom (misalnya `coach` atau `nutrisionis`), lalu centang kombinasi 4 hak akses sesuai kebutuhan:
  1. **Kelola User** — tambah, edit, reset password, nonaktifkan, dan hapus akun.
  2. **Kelola Role & Hak Akses** — buat, ubah, dan hapus role kustom.
  3. **Pantau Data Kalori & Berat Badan Semua User** — membuka tombol **Pantau** di daftar user.
  4. **Lihat Log Aktivitas Sistem (Audit Log)** — mengakses menu **Log Sistem**.

### 6.3 Log Aktivitas Sistem (Audit Log)
Buka menu **Log Sistem**:
- Setiap kejadian penting (login, register, logout, ubah password, simpan profil, tambah/edit/hapus makanan, aktivitas, BB, katalog kustom, serta pengelolaan user & role) tercatat otomatis lengkap dengan waktu, `username` + `user_id`, jenis aksi, dan detailnya.
- Gunakan kolom **pencarian**, filter **User**, dan filter **Aksi**, serta tombol **Muat Ulang** untuk memantau aktivitas terbaru.

---

## 7. Penjelasan Rumus Perhitungan

| Komponen | Rumus / Standar yang Digunakan |
| --- | --- |
| **BMI (Kemenkes RI)** | $\text{BB (kg)} / (\text{TB (m)})^2$ — `<18,5` Kurang, `18,5–25,0` Normal, `25,1–27,0` Gemuk Ringan, `>27,0` Obesitas |
| **BMR (Mifflin-St Jeor)** | Laki-laki: $10\text{BB} + 6{,}25\text{TB} - 5\text{Usia} + 5$ ; Perempuan: $10\text{BB} + 6{,}25\text{TB} - 5\text{Usia} - 161$ |
| **TDEE (Baseline Harian)** | $\text{BMR} \times \text{Faktor}$ (`1,2` Sedentari, `1,375` Ringan, `1,55` Sedang, `1,725` Aktif), dihitung dinamis memakai BB efektif per tanggal |
| **Kalori Makanan** | $(\text{gram} / 100) \times \text{kkal per 100 g}$ (untuk satuan porsi, $\text{gram} = \text{jumlah} \times \text{gram per porsi}$) |
| **Kalori Aktivitas (MET)** | $\text{round}((\text{MET} \times 3{,}5 \times \text{BB (kg)} / 200) \times \text{durasi menit})$. Untuk input jarak (`m`/`km`), durasi diestimasi dari kecepatan rata-rata aktivitas |
| **Proyeksi Perubahan BB** | $\text{Akumulasi Keseimbangan Kalori} / 7.700$ (`1 kg ≈ 7.700 kkal`), batas konsistensi evaluasi `±0,5 kg` |

---

## 8. Pemecahan Masalah (Troubleshooting) & FAQ

- **Saya mengetik angka pakai koma (misal `68,5` atau `1,5`), apakah terbaca?**  
  Ya. Seluruh kolom angka berat badan, tinggi badan, porsi, jarak, dan kalori mendukung koma (`,`) maupun titik (`.`).
- **Pencarian Open Food Facts gagal atau muncul pesan koneksi?**  
  Pastikan komputer terhubung ke internet (fitur ini mengakses `search.openfoodfacts.org`). Katalog lokal 132 makanan Indonesia dan input manual tetap berjalan 100% offline.
- **Di mana file database disimpan jika saya ingin mem-backup seluruh sistem?**  
  Seluruh data multi-user tersimpan dalam 1 file SQLite: `storage/monitoring_kalori.sqlite`. Cukup salin file tersebut untuk backup penuh server, atau gunakan tombol **Ekspor Cadangan (JSON)** di halaman Profil untuk backup per akun.
- **Bagaimana jika saya lupa password user biasa?**  
  Minta Admin masuk ke **Kelola User → Edit** pada akun Anda lalu isi kolom **Password** baru untuk meresetnya.
- **Halaman muncul pesan "KaloriKu belum dibuild"?**  
  Jalankan perintah berikut di folder proyek:
  ```powershell
  cd frontend
  npm install
  npm run build
  ```
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
