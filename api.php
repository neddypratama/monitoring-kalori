<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Access-Control-Allow-Credentials: true');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/backend/Database.php';
require_once __DIR__ . '/backend/Router.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$route = (string) ($_GET['route'] ?? '');
$rawBody = file_get_contents('php://input');
$body = [];
if (is_string($rawBody) && trim($rawBody) !== '') {
    $decoded = json_decode($rawBody, true);
    if (!is_array($decoded)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Format JSON tidak valid.'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $body = $decoded;
}

// Extract session token from HttpOnly cookie or Authorization: Bearer header
$token = $_COOKIE['kaloriku_session'] ?? null;
if (!$token) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($authHeader), $m)) {
        $token = $m[1];
    }
}

try {
    $pdo = Database::connect();
    $response = Router::handle($pdo, $method, $route, $_GET, $body, is_string($token) ? $token : null);

    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if (!empty($response['session_token'])) {
        setcookie('kaloriku_session', (string) $response['session_token'], [
            'expires' => time() + (AuthService::SESSION_DAYS * 86400),
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    } elseif (!empty($response['clear_session'])) {
        setcookie('kaloriku_session', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }

    http_response_code($response['status']);
    echo json_encode($response['payload'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Gagal menginisialisasi sistem: ' . $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
