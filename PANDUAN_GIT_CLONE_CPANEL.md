# 🚀 Panduan Lengkap Hosting KaloriKu di cPanel dengan Git Clone

Dokumen ini memandu Anda melakukan deployment dan hosting **KaloriKu (PHP 8.x + SQLite + React Vite)** di server hosting berbasis **cPanel** menggunakan metode **Git Clone** (mengikuti alur praktis seperti `erp-bimapratama`, namun jauh lebih ringan karena **tidak butuh Setup Node.js App** dan **tidak butuh setup MySQL manual**).

Kenapa metode Git Clone direkomendasikan?
1. **Bersih & Ringan:** Hasil build frontend (`dist/`) sudah tersedia di repo sehingga server cPanel tidak perlu install `node_modules`.
2. **Zero-Config Database:** Seluruh 11 tabel database (multi-user, role, kalori, aktivitas, berat badan, & audit log) memakai **SQLite** di `storage/monitoring_kalori.sqlite` yang otomatis dibuat dan dimigrasikan pada akses pertama.
3. **Update 1-Klik:** Setiap ada pembaruan di GitHub, cukup jalankan `./deploy.sh` tanpa merusak data pengguna yang sudah masuk.

---

## 📋 Daftar Isi
1. [Arsitektur & Kebutuhan Server cPanel](#1-arsitektur--kebutuhan-server-cpanel)
2. [Langkah 1: Konfigurasi Versi & Ekstensi PHP di cPanel](#langkah-1-konfigurasi-versi--ekstensi-php-di-cpanel)
3. [Langkah 2: Menghubungkan GitHub ke cPanel (SSH Deploy Key)](#langkah-2-menghubungkan-github-ke-cpanel-ssh-deploy-key)
4. [Langkah 3: Melakukan Git Clone di cPanel](#langkah-3-melakukan-git-clone-di-cpanel)
5. [Langkah 4: Setup Folder Database SQLite & Keamanan `.htaccess`](#langkah-4-setup-folder-database-sqlite--keamanan-htaccess)
6. [Langkah 5: Pasang SSL HTTPS (AutoSSL)](#langkah-5-pasang-ssl-https-autossl)
7. [Langkah 6: Login Pertama & Amankan Akun Admin](#langkah-6-login-pertama--amankan-akun-admin)
8. [Langkah 7: Cara Update Kode di Kemudian Hari & Backup Database](#langkah-7-cara-update-kode-di-kemudian-hari--backup-database)
9. [Troubleshooting Masalah Umum](#troubleshooting-masalah-umum)

---

## 1. Arsitektur & Kebutuhan Server cPanel

### Kebutuhan Server:
- **cPanel Hosting** (Shared Hosting, CloudLinux, atau VPS cPanel).
- **PHP versi 8.1, 8.2, atau 8.3** dengan ekstensi aktif:
  - `pdo_sqlite` dan `sqlite3` *(wajib untuk database)*
  - `curl` *(wajib untuk pencarian produk Open Food Facts)*
  - `mbstring` dan `json`
- Akses **Terminal** (atau SSH) / menu **Git™ Version Control**.
- Rekomendasi Domain / Subdomain:
  - Subdomain khusus: `kalori.domainanda.com` *(disarankan)*, atau subfolder/domain utama `domainanda.com`.

### Skema Direktori di cPanel (Disarankan — Mode In-Place Subdomain):
```text
/home/usernamecpanel/
└── kalori.domainanda.com/          <-- Document Root subdomain & hasil Git Clone
    ├── index.php                   <-- Entry point web UI
    ├── api.php                     <-- Entry point REST API PHP
    ├── .htaccess                   <-- Pengaman (blokir akses publik ke storage/, backend/, .git/)
    ├── deploy.sh                   <-- Script otomatis update 1-klik
    ├── backend/                    <-- Logika PHP (diblokir dari akses langsung browser)
    ├── dist/                       <-- Hasil build React Vite (CSS & JS siap pakai)
    └── storage/                    <-- Database SQLite (monitoring_kalori.sqlite, otomatis dibuat)
```

> 💡 **Alternatif Mode Terpisah:** Jika Anda ingin meletakkan hasil clone di `~/monitoring-kalori` lalu menyalin file publik ke `~/public_html/kalori`, cukup jalankan `./deploy.sh ~/public_html/kalori`.

---

## Langkah 1: Konfigurasi Versi & Ekstensi PHP di cPanel

1. Login ke **cPanel** Anda.
2. Buka menu **Select PHP Version** (atau **MultiPHP Manager**):
   - Pilih versi **PHP 8.2** atau **PHP 8.3** (minimal PHP 8.1).
3. Klik tab **Extensions**, lalu pastikan ekstensi berikut dalam keadaan **tercentang**:
   - `pdo_sqlite`
   - `sqlite3`
   - `curl`
   - `mbstring`
   - `json`

---

## Langkah 2: Menghubungkan GitHub ke cPanel (SSH Deploy Key)

Jika repository GitHub Anda bersifat **Private**, hubungkan server cPanel dengan SSH Deploy Key:

1. Di cPanel, buka menu **Terminal**.
2. Buat kunci SSH baru (jika belum punya `~/.ssh/id_github`):
   ```bash
   ssh-keygen -t ed25519 -C "cpanel-kaloriku" -f ~/.ssh/id_github -N ""
   ```
3. Daftarkan konfigurasi SSH agar otomatis menggunakan kunci ini untuk GitHub:
   ```bash
   cat << 'EOF' >> ~/.ssh/config
   Host github.com
       IdentityFile ~/.ssh/id_github
       StrictHostKeyChecking no
   EOF
   chmod 600 ~/.ssh/config ~/.ssh/id_github
   ```
4. Tampilkan Public Key:
   ```bash
   cat ~/.ssh/id_github.pub
   ```
   *Salin seluruh baris yang muncul (diawali `ssh-ed25519 ...`).*
5. Buka repository **monitoring-kalori** di **GitHub**:
   - Masuk ke **Settings** → **Deploy keys** → klik **Add deploy key**.
   - **Title:** `cPanel Hosting KaloriKu`.
   - **Key:** Tempelkan Public Key tadi, lalu klik **Add key**.

> 💡 *Jika repository Anda bersifat **Public** atau Anda sudah pernah setup SSH key dari project `erp-bimapratama`, lewati langkah pembuatan key ini dan langsung ke Langkah 3.*

---

## Langkah 3: Melakukan Git Clone di cPanel

### A. Siapkan Subdomain di cPanel
1. Buka cPanel → **Domains** → klik **Create A New Domain**.
2. Isi Domain: `kalori.domainanda.com`.
3. Hilangkan centang *"Share document root"*, lalu biarkan Document Root di `/home/usernamecpanel/kalori.domainanda.com`.
4. Klik **Submit**.

### B. Clone Repository via Terminal cPanel
1. Buka cPanel → **Terminal**.
2. Hapus folder kosong yang baru dibuat cPanel, lalu lakukan `git clone`:
   ```bash
   cd ~
   rm -rf ~/kalori.domainanda.com

   # Jika Private Repo (pakai SSH):
   git clone git@github.com:USERNAME_GITHUB/NAMA_REPO.git kalori.domainanda.com

   # ATAU jika Public Repo (pakai HTTPS):
   # git clone https://github.com/USERNAME_GITHUB/NAMA_REPO.git kalori.domainanda.com
   ```
3. Masuk ke folder proyek dan beri izin eksekusi `deploy.sh`:
   ```bash
   cd ~/kalori.domainanda.com
   chmod +x deploy.sh
   ```

> 💡 **Catatan Sebelum Clone:** Pastikan di komputer lokal Anda sudah menjalankan `git push origin main` agar commit terbaru (termasuk `dist/`, `.htaccess`, dan `deploy.sh`) sudah berada di GitHub.

---

## Langkah 4: Setup Folder Database SQLite & Keamanan `.htaccess`

Jalankan script `./deploy.sh` sekali untuk memverifikasi ekstensi PHP, membuat folder `storage/`, mengatur izin tulis, dan menginisialisasi database SQLite secara otomatis:

```bash
cd ~/kalori.domainanda.com
./deploy.sh
```

Jika sukses, Anda akan melihat output:
- `✅ Semua ekstensi PHP wajib aktif (pdo_sqlite, curl, json, mbstring).`
- `✅ Build frontend dist/ ditemukan.`
- `✅ Database SQLite siap & termigrasi.`

### Verifikasi Keamanan `.htaccess`:
File `.htaccess` sudah otomatis ikut ter-clone di root proyek. File ini memblokir akses publik ke `.git`, `storage/` (file `.sqlite`), `backend/`, `tests/`, `docs/`, dan `frontend/`.
- Coba buka di browser: `https://kalori.domainanda.com/storage/monitoring_kalori.sqlite`
- **Hasil yang benar:** Muncul halaman **403 Forbidden** (database aman, tidak bisa diunduh orang lain).

---

## Langkah 5: Pasang SSL HTTPS (AutoSSL)

1. Di cPanel, buka menu **SSL/TLS Status**.
2. Centang subdomain `kalori.domainanda.com`.
3. Klik **Run AutoSSL** dan tunggu 1–3 menit hingga gembok hijau muncul.
4. Di cPanel → **Domains**, aktifkan toggle **Force HTTPS Redirect** untuk `kalori.domainanda.com` agar cookie sesi login `HttpOnly` selalu berjalan di atas HTTPS.

---

## Langkah 6: Login Pertama & Amankan Akun Admin

1. Buka browser dan kunjungi 👉 `https://kalori.domainanda.com/`.
2. Login menggunakan akun Admin bawaan:
   - **Username:** `admin`
   - **Password:** `admin123`
3. Lengkapi profil awal singkat, lalu buka menu **Profil & Diet → Keamanan Akun — Ubah Password** untuk **segera mengganti password Admin** dengan password yang kuat.
4. Uji fitur utama:
   - Daftar user baru via tab **Daftar Baru** atau via **Panel Admin → Kelola User**.
   - Catat makanan dari **Katalog Lokal** dan tab **Cari Online (Open Food Facts)**.
   - Catat aktivitas (*Jalan Santai 500 m*) dan berat badan harian.

---

## Langkah 7: Cara Update Kode di Kemudian Hari & Backup Database

### A. Update Aplikasi (CI/CD Praktis 1-Klik)
Setiap kali ada perubahan kode di komputer lokal:
1. *(Jika ada perubahan UI di `frontend/`)* jalankan `npm run build` di folder `frontend/`, lalu `git add` → `git commit` → `git push origin main`.
2. Di Terminal cPanel, jalankan:
   ```bash
   cd ~/kalori.domainanda.com
   ./deploy.sh
   ```
   *(Atau jika memakai mode copy ke subfolder web root: `./deploy.sh ~/public_html/kalori`.)*

> 🔒 **Database Aman:** File `storage/monitoring_kalori.sqlite` masuk dalam `.gitignore`, sehingga `git pull` maupun `./deploy.sh` **tidak pernah menimpa atau menghapus** data user yang sudah tersimpan.

### B. Backup Database Server
- **Backup Penuh Seluruh User:** Cukup unduh/salin file `~/kalori.domainanda.com/storage/monitoring_kalori.sqlite` lewat File Manager cPanel atau cron job harian:
  ```bash
  cp ~/kalori.domainanda.com/storage/monitoring_kalori.sqlite ~/backups/kalori-$(date +%F).sqlite
  ```
- **Backup Per Akun:** Setiap user bisa mengunduh data pribadinya kapan saja lewat tombol **Ekspor Cadangan (JSON)** di menu **Profil & Diet**.

---

## Troubleshooting Masalah Umum

### 1. Error `could not find driver` atau `Gagal menginisialisasi sistem`
- **Penyebab:** Ekstensi PHP `pdo_sqlite` belum aktif di cPanel.
- **Solusi:** Buka cPanel → **Select PHP Version** → tab **Extensions** → centang `pdo_sqlite` dan `sqlite3`.

### 2. Error `attempt to write a readonly database` atau gagal simpan data
- **Penyebab:** Folder `storage/` belum memiliki izin tulis untuk user web server PHP.
- **Solusi:** Jalankan di Terminal cPanel:
  ```bash
  chmod 775 ~/kalori.domainanda.com/storage
  chmod 664 ~/kalori.domainanda.com/storage/monitoring_kalori.sqlite* 2>/dev/null || true
  ```

### 3. Halaman Menampilkan `KaloriKu belum dibuild` (HTTP 503)
- **Penyebab:** Folder `dist/` belum ikut ter-push ke GitHub atau belum dibuild.
- **Solusi:** Di komputer lokal jalankan `cd frontend && npm run build`, lalu commit folder `dist/` dan `git push origin main`, kemudian jalankan `./deploy.sh` di cPanel.

### 4. Pencarian Open Food Facts Gagal / Timeout
- **Penyebab:** Ekstensi `curl` belum aktif atau firewall shared hosting membatasi koneksi keluar ke `search.openfoodfacts.org`.
- **Solusi:** Pastikan ekstensi `curl` aktif di PHP Selector. Katalog lokal 132 makanan Indonesia dan input manual tetap berjalan 100% normal tanpa koneksi eksternal.

### 5. Sesi Login Selalu Terkeluar (Redirect ke Halaman Login)
- **Penyebab:** Akses masih menggunakan `http://` saat browser mengharapkan cookie konsisten, atau tanggal/jam server berbeda jauh.
- **Solusi:** Aktifkan **Force HTTPS Redirect** di cPanel (Langkah 5) dan bersihkan cookie browser untuk domain tersebut.

---
Semoga panduan ini membantu! Sistem **KaloriKu** kini siap online di cPanel dengan alur Git Clone + `./deploy.sh` yang cepat dan mudah dirawat. 🚀
