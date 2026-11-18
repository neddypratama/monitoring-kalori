#!/bin/bash
# ==============================================================================
# Script Otomasi Deploy & Update KaloriKu di cPanel (PHP + SQLite + React Build)
# ==============================================================================
# Pemakaian:
#   ./deploy.sh                        -> otomatis deteksi ~/public_html/kalori (atau mode in-place)
#   ./deploy.sh ~/public_html/kalori   -> tentukan folder web root tujuan secara manual
# ==============================================================================

set -e

TARGET_DIR="$1"
CURRENT_DIR="$(pwd -P)"

if [ -z "$TARGET_DIR" ] && [ -d "$HOME/public_html/kalori" ]; then
    CANDIDATE="$(cd "$HOME/public_html/kalori" && pwd -P)"
    if [ "$CANDIDATE" != "$CURRENT_DIR" ]; then
        TARGET_DIR="$CANDIDATE"
    fi
fi

echo "🚀 [1/4] Mengambil pembaruan kode terbaru dari GitHub..."
git pull origin main || git pull origin master

echo ""
echo "🔍 [2/4] Memeriksa versi PHP, ekstensi wajib, dan file build frontend..."
php -v | head -n 1

LOADED_MODS="$(php -m | tr '[:upper:]' '[:lower:]')"
MISSING=""
for ext in pdo_sqlite curl json mbstring; do
    if ! echo "$LOADED_MODS" | grep -qx "$ext"; then
        MISSING="$MISSING $ext"
    fi
done

if [ -n "$MISSING" ]; then
    echo "❌ Ekstensi PHP belum aktif:$MISSING"
    echo "   Aktifkan di cPanel -> Select PHP Version -> Extensions."
    exit 1
fi
echo "✅ Semua ekstensi PHP wajib aktif (pdo_sqlite, curl, json, mbstring)."

if [ ! -f "dist/index.html" ]; then
    echo "❌ File dist/index.html tidak ditemukan! Jalankan 'npm run build' di folder frontend lokal lalu git push."
    exit 1
fi
echo "✅ Build frontend dist/ ditemukan."

echo ""
echo "🗄️  [3/4] Menyiapkan folder database SQLite & menjalankan auto-migrasi..."
mkdir -p storage
chmod 775 storage 2>/dev/null || chmod 755 storage 2>/dev/null || true
php -r 'require_once "backend/Database.php"; Database::connect(); echo "Database SQLite siap & termigrasi.\n";'

if [ -n "$TARGET_DIR" ]; then
    echo ""
    echo "🌐 [4/4] Menyinkronkan aplikasi ke web root: $TARGET_DIR ..."
    mkdir -p "$TARGET_DIR" "$TARGET_DIR/storage"
    cp -f index.php api.php .htaccess "$TARGET_DIR"/
    rm -rf "$TARGET_DIR/backend" "$TARGET_DIR/dist"
    cp -r backend dist "$TARGET_DIR"/
    chmod 775 "$TARGET_DIR/storage" 2>/dev/null || chmod 755 "$TARGET_DIR/storage" 2>/dev/null || true
    (cd "$TARGET_DIR" && php -r 'require_once "backend/Database.php"; Database::connect(); echo "Database target siap.\n";')
    echo "✅ Sinkronisasi ke $TARGET_DIR selesai (database existing tetap aman)."
else
    echo ""
    echo "✅ [4/4] Mode In-Place aktif — tidak perlu menyalin ke folder lain."
fi

echo ""
echo "========================================================================"
echo "🎉 DEPLOYMENT SUKSES! KaloriKu telah aktif dan siap digunakan."
echo "========================================================================"
