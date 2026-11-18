<<<<<<< HEAD
# Desain Tambahan — Multi-User Login, RBAC (Manage Role & Manage User), Isolasi `user_id`, & Audit Log

**Tanggal:** 2026-11-18  
**Dasar:** Melanjutkan [2026-11-18-monitoring-kalori-design.md](2026-11-18-monitoring-kalori-design.md)

## Ringkasan Kebutuhan
1. **Autentikasi (Login, Daftar Sendiri, Logout, Ubah Password):**
   - Pengguna dapat mendaftar sendiri di halaman Login (otomatis mendapat role `user`) maupun dibuatkan akun oleh Admin.
   - Password di-hash menggunakan `password_hash()` (bcrypt/argon2 PHP).
   - Sesi dikelola via tabel `user_sessions` (token acak 64-hex disimpan di cookie `HttpOnly; SameSite=Lax` serta didukung via `Authorization: Bearer` untuk pengujian/API).
   - Seed otomatis 1 akun Admin awal (`admin` / `admin123`) bila tabel `users` kosong; data single-user lama (jika ada) dimigrasikan ke `user_id = 1`.
2. **Manage Role (`roles`):**
   - Role bawaan `admin` (seluruh izin aktif) dan `user` (izin standar pengguna) dengan flag `is_system = 1` (tidak dapat dihapus).
   - Admin dapat membuat, mengubah, dan menghapus role baru dengan 4 izin granular: `can_manage_users`, `can_manage_roles`, `can_view_all_users_data`, `can_view_audit_logs`.
3. **Manage User & Pemantauan Progres (`users`):**
   - Admin dapat membuat user baru, mengedit profil akun/role, mengaktifkan/menonaktifkan, mereset password, dan menghapus user (terlindung agar tidak bisa menghapus/menonaktifkan diri sendiri atau Admin aktif terakhir).
   - Admin (atau role berizin `can_view_all_users_data`) dapat memantau ringkasan kalori harian, berat badan, evaluasi diet, dan log terbaru tiap user.
4. **Isolasi Data per `user_id`:**
   - `user_profile` (`PRIMARY KEY (user_id)`), `food_logs` (`user_id`), `activity_logs` (`user_id`), `weight_logs` (`UNIQUE(user_id, log_date)`), custom `foods`/`activities` (`user_id` untuk `is_custom = 1`, `NULL` untuk katalog bawaan), dan `user_favorites` (`PRIMARY KEY (user_id, item_type, item_id)`).
5. **Log Sistem (`audit_logs`):**
   - Mencatat otomatis login, register, logout, ubah password, simpan profil, CRUD log makanan/aktivitas/BB, CRUD katalog kustom, dan CRUD user/role dengan `user_id`, `username_snapshot`, `action`, `entity_type`, `entity_id`, `target_user_id`, `details`, dan `created_at`.
=======
# Desain Tambahan — Multi-User Login, RBAC (Manage Role & Manage User), Isolasi `user_id`, & Audit Log

**Tanggal:** 2026-11-18  
**Dasar:** Melanjutkan [2026-11-18-monitoring-kalori-design.md](2026-11-18-monitoring-kalori-design.md)

## Ringkasan Kebutuhan
1. **Autentikasi (Login, Daftar Sendiri, Logout, Ubah Password):**
   - Pengguna dapat mendaftar sendiri di halaman Login (otomatis mendapat role `user`) maupun dibuatkan akun oleh Admin.
   - Password di-hash menggunakan `password_hash()` (bcrypt/argon2 PHP).
   - Sesi dikelola via tabel `user_sessions` (token acak 64-hex disimpan di cookie `HttpOnly; SameSite=Lax` serta didukung via `Authorization: Bearer` untuk pengujian/API).
   - Seed otomatis 1 akun Admin awal (`admin` / `admin123`) bila tabel `users` kosong; data single-user lama (jika ada) dimigrasikan ke `user_id = 1`.
2. **Manage Role (`roles`):**
   - Role bawaan `admin` (seluruh izin aktif) dan `user` (izin standar pengguna) dengan flag `is_system = 1` (tidak dapat dihapus).
   - Admin dapat membuat, mengubah, dan menghapus role baru dengan 4 izin granular: `can_manage_users`, `can_manage_roles`, `can_view_all_users_data`, `can_view_audit_logs`.
3. **Manage User & Pemantauan Progres (`users`):**
   - Admin dapat membuat user baru, mengedit profil akun/role, mengaktifkan/menonaktifkan, mereset password, dan menghapus user (terlindung agar tidak bisa menghapus/menonaktifkan diri sendiri atau Admin aktif terakhir).
   - Admin (atau role berizin `can_view_all_users_data`) dapat memantau ringkasan kalori harian, berat badan, evaluasi diet, dan log terbaru tiap user.
4. **Isolasi Data per `user_id`:**
   - `user_profile` (`PRIMARY KEY (user_id)`), `food_logs` (`user_id`), `activity_logs` (`user_id`), `weight_logs` (`UNIQUE(user_id, log_date)`), custom `foods`/`activities` (`user_id` untuk `is_custom = 1`, `NULL` untuk katalog bawaan), dan `user_favorites` (`PRIMARY KEY (user_id, item_type, item_id)`).
5. **Log Sistem (`audit_logs`):**
   - Mencatat otomatis login, register, logout, ubah password, simpan profil, CRUD log makanan/aktivitas/BB, CRUD katalog kustom, dan CRUD user/role dengan `user_id`, `username_snapshot`, `action`, `entity_type`, `entity_id`, `target_user_id`, `details`, dan `created_at`.
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
