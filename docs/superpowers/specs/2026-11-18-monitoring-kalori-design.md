# PRD & Dokumen Desain — Sistem Monitoring Kalori & Program Diet ("KaloriKu")

**Tanggal:** 2026-11-18  
**Workspace:** `c:\laragon\www\monitoring-kalori`  
**Status:** Draft (Menunggu Review & Persetujuan)

---

## 1. Tujuan & Latar Belakang (Intent & The Why)

Membangun aplikasi web pribadi untuk **monitoring kalori dan program diet** yang mudah digunakan setiap hari. Dua masalah utama yang diselesaikan:

1. **Hambatan pencatatan manual:** Pengguna tidak perlu mencari angka kalori makanan satu per satu atau menghitung sendiri berapa kalori yang terbakar saat berjalan 500 meter—sistem menghitung otomatis dari nama makanan + porsi dan dari jenis aktivitas + jarak/durasi.
2. **Evaluasi efektivitas diet yang nyata:** Mencatat kalori saja sering tidak cukup jika tidak dikaitkan dengan hasilnya. Dengan menggabungkan pencatatan **kalori masuk**, **kalori keluar**, dan **berat badan (BB) harian**, pengguna bisa melihat secara langsung apakah pola kalori yang dicatat benar-benar tercermin pada perkembangan berat badannya.

---

## 2. Pengguna & Lingkup (Goals, Non-Goals, Anti-Goals)

### Pengguna Target
Pengguna tunggal (pribadi) yang menjalankan pemantauan kalori / program diet harian melalui browser web (desktop maupun mobile).

### Goals (Harus Dicapai)
1. **Profil Awal & Perhitungan Program Diet:**
   - Input awal berat badan (BB) dan tinggi badan (TB), ditambah usia, jenis kelamin, tingkat aktivitas dasar, dan tujuan diet/target BB *(pilihan kami: usia, jenis kelamin, tingkat aktivitas, dan target BB disertakan dengan nilai default yang ramah agar BMR/TDEE dan kalori aktivitas lebih akurat)*.
   - Otomatis menghitung **BMI** (kategori standar Kemenkes RI), **BMR** (Mifflin-St Jeor), **TDEE** (kebutuhan kalori harian), dan **Target Kalori Harian** (bisa di-override manual oleh pengguna).
2. **Auto-Calculate Kalori Masuk (Makanan & Minuman):**
   - Katalog bawaan makanan & minuman Indonesia serta makanan umum (≥120 item: nasi, lauk, masakan populer, sayur, buah, minuman, camilan) dengan data kalori per porsi standar dan per 100 gram, plus info makronutrisi (protein, karbohidrat, lemak) sebagai informasi pendukung.
   - Input porsi fleksibel (porsi/piring/mangkok/potong/butir/gelas/sdm/gram) dengan pratinjau kalori real-time sebelum disimpan.
   - Pengelompokan waktu makan: Sarapan, Makan Siang, Makan Malam, Camilan.
   - Dukungan menambah makanan kustom ke katalog pribadi (sekali simpan, seterusnya tersedia di auto-complete & auto-hitung) serta input cepat manual (nama + kalori) bila diperlukan.
3. **Auto-Calculate Kalori Keluar (Olahraga & Aktivitas Harian):**
   - Katalog bawaan aktivitas berbasis nilai **MET** (jalan santai, jalan cepat, lari/jogging, bersepeda, berenang, gym/angkat beban, futsal, badminton, senam/aerobik, yoga, naik tangga, aktivitas rumah tangga, dll.).
   - **Dukungan satuan jarak (meter & km) maupun durasi (menit):**
     - Contoh: input **"Jalan santai — 500 m"** langsung menghitung kalori keluar secara otomatis berdasarkan berat badan terkini pengguna.
   - Dukungan menambah aktivitas kustom atau input kalori terbakar manual.
4. **Monitoring Berat Badan Harian & Evaluasi Kesesuaian Kalori vs BB:**
   - Pencatatan cepat BB harian (maksimal 1 catatan per tanggal; input ulang di tanggal yang sama akan memperbarui catatan hari tersebut) beserta catatan singkat opsional.
   - Evaluasi otomatis yang membandingkan **perubahan BB aktual** terhadap **estimasi perubahan BB teoritis** dari akumulasi defisit/surplus kalori (`1 kg ≈ 7.700 kkal`) hanya pada hari-hari yang tercatat.
   - Indikator status evaluasi yang jujur dan mudah dipahami (termasuk penjelasan bahwa butuh minimal 3 hari data sebelum analisis tren dihitung).
5. **Dashboard Informatif, Menarik, & Mudah Digunakan:**
   - Ringkasan hari ini dalam sekali pandang: kalori masuk vs target, kalori keluar aktivitas, sisa kuota kalori, BB terbaru & status BMI.
   - Kartu evaluasi korelasi Kalori vs Perkembangan BB.
   - Grafik interaktif:
     - Kalori Masuk vs Kalori Keluar vs Target (filter 7 / 14 / 30 hari).
     - Tren BB Aktual (+ garis rata-rata bergerak/moving average 7 hari bila data cukup) vs Proyeksi BB Teoritis dari catatan kalori.
   - Akses input cepat (<10 detik) dari dashboard maupun halaman catatan harian, plus kemampuan melihat, mengedit, dan menghapus riwayat hari ini atau hari sebelumnya.

### Non-Goals (Di Luar Lingkup Versi Ini)
- Multi-user, sistem login/registrasi, atau manajemen hak akses.
- Integrasi API pihak ketiga berbayar (AI vision / LLM berbayar) atau sinkronisasi wearable (Apple Health, Google Fit, Strava).
- Pemindai barcode kamera.
- Fitur sosial/komunitas.

### Anti-Goals (Dianggap Gagal Jika Terjadi)
- **Alur input berbelit:** pengguna perlu banyak langkah hanya untuk mencatat "nasi goreng 1 piring" atau "jalan 500 m".
- **Angka membingungkan / double-counting:** pengguna bingung membedakan metabolisme harian (TDEE) dengan kalori olahraga yang diinput sehingga angka defisit terasa tidak masuk akal.
- **Setup rumit:** butuh konfigurasi database MySQL manual atau API key eksternal sebelum aplikasi bisa dipakai.
- **UI padat seperti tabel mentah:** tampilan tidak ramah dilihat atau sulit dibaca di layar laptop maupun HP.

---

## 3. Keputusan Teknis & Arsitektur (Constraints & Our Calls)

Pengguna membebaskan pilihan bahasa pemrograman dan UI asalkan berbasis web dan mudah digunakan. Workspace berada di lingkungan Laragon (`c:\laragon\www\monitoring-kalori`) dengan PHP 8.3 (`pdo_sqlite` aktif) dan Node.js v22 tersedia.

### Pilihan Stack *(Keputusan Kami)*
- **Backend:** PHP 8.3 ringan (tanpa framework berat) + database **SQLite (`pdo_sqlite`)** di `storage/monitoring_kalori.sqlite`.
  - Schema tabel dan data katalog bawaan (makanan & aktivitas) diinisialisasi otomatis pada akses pertama (zero-config).
  - Routing API melalui `api.php?route=...` dengan format JSON agar berjalan mulus baik diakses lewat `http://monitoring-kalori.test/`, `http://localhost/monitoring-kalori/`, maupun `php -S localhost:8000` tanpa bergantung aturan rewrite `.htaccess`.
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + Recharts + Lucide Icons.
  - Dibuild dengan `base: './'` ke folder `public/assets/` (atau root `dist/` yang dilayani langsung oleh `index.php`) sehingga di Laragon pengguna cukup membuka URL di browser tanpa perlu menyalakan dev server Node setiap hari.
  - Mode dev Vite tetap tersedia dengan proxy ke PHP API untuk proses pengembangan.
- **Bahasa Antarmuka:** Bahasa Indonesia penuh, konsisten, ramah, dan bebas istilah teknis yang membingungkan.
- **Keamanan & Portabilitas Data:** Fitur ekspor data ke JSON di halaman Profil agar pengguna bisa mencadangkan riwayat dietnya kapan saja.

---

## 4. Logika Perhitungan & Domain Formula

Agar hasil perhitungan akurat, transparan, dan tidak menimbulkan double-counting:

### 4.1 Profil, BMI, BMR, & TDEE
- **Berat Badan Acuan Dinamis *(Keputusan Kami)*:** Perhitungan **BMI**, **BMR**, **TDEE saat ini**, dan **rekomendasi target kalori otomatis** selalu dihitung dinamis memakai **BB terbaru dari `weight_logs`** (fallback ke `initial_weight_kg` bila belum ada log BB), selaras dengan perhitungan kalori aktivitas di §4.3. Jika pengguna mengatur target kalori secara manual (`is_manual_target = 1`), angka manual tersebut tetap dihormati hingga diubah kembali ke mode otomatis.
- **BMI:** $\text{BB (kg)} / (\text{TB (m)})^2$  
  Kategori (standar Kemenkes RI):
  - `< 18.5`: Berat Badan Kurang
  - `18.5 – 25.0`: Normal
  - `25.1 – 27.0`: Gemuk Ringan
  - `> 27.0`: Obesitas
- **BMR (Mifflin-St Jeor):**
  - Laki-laki: $10 \times \text{BB} + 6.25 \times \text{TB (cm)} - 5 \times \text{Usia} + 5$
  - Perempuan: $10 \times \text{BB} + 6.25 \times \text{TB (cm)} - 5 \times \text{Usia} - 161$
- **Baseline Pengeluaran Harian (TDEE):** $\text{BMR} \times \text{Faktor Aktivitas}$
  - Sedentari (`1.2`) — *disarankan sebagai default jika pengguna rutin mencatat semua aktivitas jalan/olahraga*
  - Ringan (`1.375`)
  - Sedang (`1.55`)
  - Aktif (`1.725`)
- **TDEE Historis per Tanggal *(Keputusan Kami)*:** Untuk perhitungan defisit/surplus pada tanggal-tanggal lampau, sistem menghitung `Baseline TDEE` per tanggal memakai **BB efektif pada tanggal tersebut** (carry-forward dari entri `weight_logs` terakhir yang `log_date <= tanggal`, fallback ke `initial_weight_kg`) dikombinasikan dengan data profil aktif (`height_cm`, `age`, `gender`, `activity_level`). Pendekatan ini akurat mengikuti penurunan/kenaikan BB tanpa memerlukan tabel snapshot profil tambahan.
- **Rekomendasi Target Kalori Masuk Harian:**
  - Mode **Turun BB**: `max(batas_aman, round(TDEE - 500))` *(batas aman: 1.200 kkal perempuan, 1.500 kkal laki-laki)*
  - Mode **Jaga BB**: `round(TDEE)`
  - Mode **Naik BB**: `round(TDEE + 300)`
  - Pengguna tetap dapat mengubah target kalori harian secara manual di Profil.

### 4.2 Auto-Calculate Kalori Makanan
- Setiap item di tabel `foods` memiliki:
  - `name`, `category` (Makanan Pokok, Lauk, Sayur, Masakan Jadi, Buah, Minuman, Camilan)
  - `default_unit` (misal: `piring`, `porsi`, `potong`, `butir`, `gelas`, `mangkok`)
  - `serving_grams` (gram per 1 satuan default, misal 1 piring nasi putih = 150 g)
  - `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`
  - `is_custom` (0 = bawaan, 1 = buatan pengguna)
- Perhitungan saat input:
  - Jika satuan = `gram`: `kkal = round((jumlah / 100) * calories_per_100g)`
  - Jika satuan = `default_unit` (misal 1.5 piring): `kkal = round((jumlah * serving_grams / 100) * calories_per_100g)`
  - Nilai makro (protein, karbo, lemak) dihitung proporsional dengan rumus yang sama.
  - Saat menyimpan log makanan (`food_logs`), simpan snapshot nama, jumlah, satuan, dan kalori terhitung sehingga perubahan katalog di masa depan tidak merusak riwayat lama.

### 4.3 Auto-Calculate Kalori Aktivitas (Jarak & Durasi)
- Setiap item di tabel `activities` memiliki:
  - `name`, `category` (Kardio, Jalan & Lari, Kekuatan, Olahraga Permainan, Aktivitas Harian)
  - `met` (nilai MET)
  - `supports_distance` (0 atau 1)
  - `default_speed_kmh` (kecepatan rata-rata untuk konversi jarak ke durasi, misal jalan santai `4.5`, jalan cepat `6.0`, jogging `8.0`, lari `10.0`, bersepeda santai `16.0`, berenang `2.0`)
  - `is_custom` (0 = bawaan, 1 = buatan pengguna)
- Berat badan acuan: BB terbaru dari `weight_logs` (fallback ke `initial_weight_kg` di `user_profile`).
- Rumus perhitungan:
  - Jika input **durasi (`menit`)**:
    $$\text{kkal} = \text{round}\left(\frac{\text{MET} \times 3.5 \times \text{BB (kg)}}{200} \times \text{menit}\right)$$
  - Jika input **jarak (`m` atau `km`)** pada aktivitas dengan `supports_distance = 1`:
    1. Konversi ke km: `jarak_km = (satuan === 'm') ? nilai / 1000 : nilai`
    2. Konversi ke estimasi durasi: `menit = (jarak_km / default_speed_kmh) * 60`
    3. Hitung kalori dengan rumus MET di atas.
  - *Contoh validasi:* BB 70 kg, **Jalan santai 500 m** (`MET = 3.3`, `speed = 4.5 km/jam` → `6.67 menit`) ⇒ `3.3 × 3.5 × 70 / 200 × 6.67 ≈ 27 kkal`.
  - Simpan snapshot nama aktivitas, nilai input, satuan (`m`, `km`, `menit`), berat badan saat dicatat, dan kalori terbakar ke `activity_logs`.

### 4.4 Keseimbangan Kalori & Evaluasi Kesesuaian terhadap BB
- **Keseimbangan Harian (per tanggal):**
  - `Kalori Masuk` = total `food_logs` pada tanggal tersebut
  - `Kalori Aktivitas` = total `activity_logs` pada tanggal tersebut
  - `Total Pengeluaran` = `Baseline TDEE + Kalori Aktivitas`
  - `Defisit / Surplus Harian` = `Kalori Masuk - Total Pengeluaran` (negatif berarti defisit, positif berarti surplus)
  - `Sisa Kuota Target Hari Ini` = `(Target Kalori Harian + Kalori Aktivitas) - Kalori Masuk` *(dengan label jelas bahwa aktivitas menambah ruang kalori harian)*
- **Evaluasi Kesesuaian Program Diet (Periode 7 / 14 / 30 hari / Semua):**
  - **Penyelarasan Rentang Tanggal BB & Kalori *(Keputusan Kami)*:** Dalam periode kalender yang dipilih, tentukan `tanggal BB terawal` (`start_weight_date`) dan `tanggal BB terbaru` (`end_weight_date`) yang ada di dalam periode tersebut. Akumulasi keseimbangan kalori (serta syarat minimal 3 hari data kalori) dihitung **hanya pada tanggal yang memiliki catatan `food_logs` di dalam rentang `start_weight_date <= log_date <= end_weight_date`** agar hari kosong maupun hari di luar rentang penimbangan tidak memicu status keliru.
  - **Titik Jangkar Grafik Proyeksi Teoritis *(Keputusan Kami)*:** Pada grafik Tren Berat Badan (§6.2), garis proyeksi BB teoritis dimulai (anchored) tepat di `start_weight_date` dengan nilai `BB Terawal`, lalu bergerak maju hari per hari dengan menambahkan `Defisit / Surplus Harian / 7700` pada setiap tanggal yang memiliki catatan makanan hingga akhir periode—sehingga angka di kartu evaluasi dan bentuk garis pada grafik selalu 100% konsisten.
  - `Estimasi Perubahan BB Teoritis (kg)` = `Akumulasi Keseimbangan (kkal) / 7700`
  - `Perubahan BB Aktual (kg)` = `BB Terbaru dalam periode - BB Terawal dalam periode`
  - **Aturan Status:**
    - `< 3` hari data BB dalam periode atau `< 3` hari data kalori dalam rentang penimbangan (`start_weight_date` s.d. `end_weight_date`) → **"Mengumpulkan Data"** (tampilkan progres berapa hari lagi dibutuhkan).
    - `|Perubahan Aktual - Estimasi Teoritis| ≤ 0.5 kg` → **"Sesuai Jalur"** (catatan kalori selaras dengan perkembangan BB).
    - `Perubahan Aktual < Estimasi Teoritis - 0.5 kg` → **"Turun Lebih Cepat dari Estimasi"** (penjelasan: kemungkinan aktivitas non-olahraga lebih tinggi atau fluktuasi cairan tubuh).
    - `Perubahan Aktual > Estimasi Teoritis + 0.5 kg` → **"Lebih Lambat dari Estimasi"** (penjelasan: kemungkinan estimasi porsi sedikit lebih kecil dari aktual, ada camilan belum tercatat, atau retensi air normal).

---

## 5. Rancangan Struktur Data (SQLite)

1. **`user_profile`** (single row, `id = 1`):
   - `name`, `gender` (`male`/`female`), `age`, `height_cm`, `initial_weight_kg`, `target_weight_kg`, `activity_level`, `goal_type` (`lose`/`maintain`/`gain`), `daily_calorie_target` (nullable jika ikut otomatis, atau tersimpan nilai aktif + flag `is_manual_target`), `created_at`, `updated_at`.
2. **`foods`**:
   - `id`, `name`, `category`, `default_unit`, `serving_grams`, `calories_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `is_custom`, `is_favorite`, `created_at`.
3. **`activities`**:
   - `id`, `name`, `category`, `met`, `supports_distance`, `default_speed_kmh`, `is_custom`, `is_favorite`, `created_at`.
4. **`food_logs`**:
   - `id`, `log_date` (`YYYY-MM-DD`), `meal_type` (`sarapan`/`siang`/`malam`/`camilan`), `food_id` (nullable), `food_name`, `quantity`, `unit`, `calories`, `protein`, `carbs`, `fat`, `notes`, `created_at`.
5. **`activity_logs`**:
   - `id`, `log_date` (`YYYY-MM-DD`), `activity_id` (nullable), `activity_name`, `input_value`, `input_unit` (`m`/`km`/`menit`), `duration_minutes`, `distance_meters` (nullable), `weight_kg_used`, `calories_burned`, `notes`, `created_at`.
6. **`weight_logs`**:
   - `id`, `log_date` (`YYYY-MM-DD`, UNIQUE), `weight_kg`, `notes`, `created_at`, `updated_at`.

---

## 6. Rancangan Pengalaman Pengguna & Tampilan (UI/UX)

### Gaya Visual *(Keputusan Kami)*
- Bersih, hangat, modern (nuansa health-tech yang tenang: latar putih/slate lembut, aksen **emerald/teal** untuk progres kalori sehat, **amber/coral** untuk kalori terbakar, **indigo** untuk tren berat badan).
- Tipografi modern & angka tabular (`tabular-nums`) agar perbandingan angka rapi.
- Responsif: sidebar kiri di layar desktop dan bottom navigation bar di layar mobile.

### Alur & Halaman Utama
1. **Onboarding Awal (Muncul otomatis jika `user_profile` belum ada):**
   - Form 1 layar yang ringkas: Nama (opsional), Berat Badan (kg), Tinggi Badan (cm), Usia, Jenis Kelamin, Tingkat Aktivitas, Tujuan Diet & Target BB.
   - Panel pratinjau langsung menunjukkan hasil **BMI, BMR, TDEE, dan Target Kalori Harian** sebelum klik "Mulai Program".
   - Menyimpan profil sekaligus otomatis mencatat entri `weight_logs` pertama untuk hari ini.
2. **Dashboard (Beranda):**
   - **Header Tanggal & Tombol Cepat:** `+ Catat Makan`, `+ Catat Aktivitas`, `+ Catat BB`.
   - **Ringkasan Hari Ini (Hero Cards):**
     - Progress ring/gauge **Kalori Masuk vs Target** (beserta sisa kuota kalori).
     - Kartu **Kalori Terbakar** (total aktivitas hari ini + ringkasan aktivitas).
     - Kartu **Berat Badan Terkini** (BB terakhir, perubahan dari BB awal, badge BMI).
     - Ringkasan makro harian (Protein / Karbo / Lemak) dalam bar ringkas.
   - **Kartu Evaluasi Program Diet (Kalori vs BB):**
     - Pemilih rentang waktu (`7 Hari`, `14 Hari`, `30 Hari`, `Semua`).
     - Menampilkan status kesesuaian, perbandingan angka Perubahan BB Aktual vs Estimasi Teoritis, dan penjelasan singkat yang mudah dipahami.
   - **Dua Grafik Interaktif (Recharts):**
     - *Grafik Tren Berat Badan*: Garis BB aktual harian vs garis proyeksi teoritis dari kalori (+ garis target BB).
     - *Grafik Kalori Harian*: Bar kalori masuk vs kalori terbakar + garis target kalori harian.
3. **Catatan Harian (Log):**
   - Navigasi tanggal (`<`, pilih tanggal, `>`, tombol "Hari Ini").
   - Ringkasan singkat tanggal terpilih (masuk, keluar, netto, BB hari itu).
   - Daftar makanan dikelompokkan per waktu makan (Sarapan, Makan Siang, Makan Malam, Camilan) + tombol tambah cepat per kategori, edit, dan hapus.
   - Daftar aktivitas hari tersebut + tombol tambah, edit, dan hapus.
   - Modal/Form input makanan: kolom pencarian real-time (prioritaskan favorit & sering dipakai), pilih item, isi jumlah + satuan (`porsi/default_unit` atau `gram`), kalori langsung tampil otomatis sebelum simpan. Opsi "Input Manual / Tambah ke Katalog" tersedia langsung di modal.
   - Modal/Form input aktivitas: pencarian real-time, pilih aktivitas, pilih satuan (`meter`, `km`, atau `menit` sesuai aktivitas), isi angka (misal `500` `m`), kalori keluar langsung tampil otomatis dengan info rumus/BB yang dipakai.
4. **Katalog Makanan & Aktivitas:**
   - Dua tab: **Makanan** dan **Aktivitas**.
   - Pencarian, filter kategori, tandai favorit, tambah item kustom baru, edit/hapus item kustom.
5. **Profil & Program Diet:**
   - Edit data profil (TB, usia, jenis kelamin, tingkat aktivitas, tujuan diet, target BB, target kalori harian otomatis/manual).
   - Tabel riwayat pencatatan berat badan (bisa tambah/edit/hapus tanggal tertentu).
   - Tombol **Ekspor Data (JSON)** untuk cadangan data pribadi.

---

## 7. Hal yang Diserahkan ke Builder (Left to the Builder)

- Rincian struktur direktori kode internal PHP (`api/` controllers/repositories) dan komponen React (`src/components`, `src/pages`, `src/hooks`).
- Daftar lengkap ≥120 makanan Indonesia & umum serta ≥25 aktivitas beserta nilai gizi/MET yang akurat dari referensi gizi umum (TKPI/USDA/Compendium of Physical Activities).
- Detail validasi input edge-case (nilai negatif, 0, angka desimal koma/titik, sanitasi input SQLite PDO prepared statements).
- Desain micro-interaction (loading skeleton, toast notification, empty state, konfirmasi hapus).
- Pengujian otomatis (unit test rumus perhitungan BMI/BMR/TDEE/aktivitas jarak-durasi/evaluasi kalori-BB, API integration test PHP+SQLite, dan build/render verification).
