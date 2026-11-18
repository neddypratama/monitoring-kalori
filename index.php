<?php
declare(strict_types=1);

$distHtml = __DIR__ . DIRECTORY_SEPARATOR . 'dist' . DIRECTORY_SEPARATOR . 'index.html';

if (is_file($distHtml)) {
    header('Content-Type: text/html; charset=utf-8');
    $html = file_get_contents($distHtml);
    // Rewrite relative ./assets/ to ./dist/assets/ so root vhost, subdirectory, and php -S all resolve identically
    $html = str_replace(['src="./assets/', 'href="./assets/'], ['src="./dist/assets/', 'href="./dist/assets/'], (string) $html);
    echo $html;
    exit;
}

http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>KaloriKu — Build Diperlukan</title></head><body style="font-family:sans-serif;max-width:540px;margin:64px auto;padding:0 16px;color:#1e293b"><h1>KaloriKu belum dibuild</h1><p>Jalankan <code>npm --prefix frontend run build</code> di folder proyek untuk menghasilkan file tampilan di <code>dist/</code>.</p></body></html>';
