#!/bin/bash
# ==============================================================================
# Script Otomasi Deploy & Update KaloriKu di cPanel (PHP + SQLite + React Build)
# ==============================================================================
# Pemakaian:
#   1. Mode In-Place (repo di-clone langsung ke Document Root domain/subdomain):
#      ./deploy.sh
#   2. Mode Copy ke Web Root terpisah (misal repo di ~/monitoring-kalori, web di ~/public_html/kalori):
#      ./deploy.sh ~/public_html/kalori
# ==============================================================================

set -e

TARGET_DIR="$1"

echo "🚀 [1/4] Mengambil pembaruan kode terbaru dari GitHub..."
git pull origin main || git pull origin master

echo ""
echo "🔍 [2/4] Memeriksa versi PHP, ekstensi wajib, dan file build frontend..."
php -v | head -n 1
php -r '
$required = ["pdo_sqlite", "curl", "json", "mbstring"];
$missing = [];
foreach ($required as $ext) {
    if (!extension_loaded($ext)) $missing[] = $ext;
}
if (!empty($missing)) {
    fwrite(STDERR, "❌ Ekstensi PHP belum aktif: " . implode(", ", $missing) . "\n");
    exit(1);
}
echo "✅ Semua ekstensi PHP wajib aktif (pdo_sqlite, curl, json, mbstring).\n";
'

if [ ! -f "dist/index.html" ]; then
    echo "❌ File dist/index.html tidak ditemukan! Jalankan 'npm run build' di folder frontend lokal lalu git push."
    exit 1
fi
echo "✅ Build frontend dist/ ditemukan."

echo ""
echo "🗄️  [3/4] Menyiapkan folder database SQLite & menjalankan auto-migrasi..."
mkdir -p storage
chmod 775 storage || chmod 755 storage || true
php -r 'require_once "backend/Database.php"; Database::connect(); echo "✅ Database SQLite siap & termigrasi.\n";'

if [ -n "$TARGET_DIR" ]; then
    echo ""
    echo "🌐 [4/4] Menyinkronkan aplikasi ke web root: $TARGET_DIR ..."
    mkdir -p "$TARGET_DIR" "$TARGET_DIR/storage"
    cp -f index.php api.php .htaccess "$TARGET_DIR"/
    rm -rf "$TARGET_DIR/backend" "$TARGET_DIR/dist"
    cp -r backend dist "$TARGET_DIR"/
    chmod 775 "$TARGET_DIR/storage" || chmod 755 "$TARGET_DIR/storage" || true
    # Jalankan migrasi pada database target (tidak menimpa file .sqlite yang sudah ada)
    (cd "$TARGET_DIR" && php -r 'require_once "backend/Database.php"; Database::connect();')
    echo "✅ Sinkronisasi ke $TARGET_DIR selesai (database existing tetap aman)."
else
    echo ""
    echo "✅ [4/4] Mode In-Place aktif — tidak perlu menyalin ke folder lain."
fi

echo ""
echo "========================================================================"
echo "🎉 DEPLOYMENT SUKSES! KaloriKu telah aktif dan siap digunakan."
echo "========================================================================"
