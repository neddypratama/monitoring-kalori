<?php
declare(strict_types=1);

require_once __DIR__ . '/AuditService.php';

final class AuthService
{
    public const SESSION_DAYS = 30;

    public static function validateUsername(string $username): string
    {
        $clean = strtolower(trim($username));
        if (!preg_match('/^[a-z0-9._-]{3,32}$/', $clean)) {
            throw new InvalidArgumentException('Username harus 3–32 karakter (huruf, angka, titik, garis bawah, atau tanda hubung).');
        }
        return $clean;
    }

    public static function validatePassword(string $password): void
    {
        if (strlen($password) < 6) {
            throw new InvalidArgumentException('Password minimal 6 karakter.');
        }
    }

    /**
     * @return array{user: array<string, mixed>, token: string}
     */
    public static function register(PDO $pdo, string $username, string $fullName, string $password): array
    {
        $cleanUser = self::validateUsername($username);
        self::validatePassword($password);
        $cleanName = trim($fullName);
        if ($cleanName === '') {
            $cleanName = $cleanUser;
        }

        $exists = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $exists->execute([$cleanUser]);
        if ($exists->fetch(PDO::FETCH_ASSOC)) {
            throw new InvalidArgumentException("Username '{$cleanUser}' sudah dipakai. Pilih username lain.");
        }

        $roleStmt = $pdo->prepare("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
        $roleStmt->execute();
        $roleRow = $roleStmt->fetch(PDO::FETCH_ASSOC);
        if (!$roleRow) {
            throw new RuntimeException('Role bawaan user tidak ditemukan.');
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare(
            'INSERT INTO users (username, full_name, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, 1)'
        );
        $stmt->execute([$cleanUser, $cleanName, $hash, (int) $roleRow['id']]);
        $userId = (int) $pdo->lastInsertId();

        AuditService::record($pdo, $userId, $cleanUser, 'register', 'user', $userId, $userId, 'Registrasi akun mandiri');

        $token = self::createSession($pdo, $userId);
        $authUser = self::getUserWithRole($pdo, $userId);
        return ['user' => $authUser, 'token' => $token];
    }

    /**
     * @return array{user: array<string, mixed>, token: string}
     */
    public static function login(PDO $pdo, string $username, string $password): array
    {
        $cleanUser = strtolower(trim($username));
        if ($cleanUser === '' || $password === '') {
            throw new InvalidArgumentException('Username dan password wajib diisi.');
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
        $stmt->execute([$cleanUser]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            throw new InvalidArgumentException('Username atau password salah.');
        }
        if ((int) $user['is_active'] !== 1) {
            throw new InvalidArgumentException('Akun Anda sedang dinonaktifkan oleh Admin.');
        }

        $userId = (int) $user['id'];
        $token = self::createSession($pdo, $userId);
        AuditService::record($pdo, $userId, (string) $user['username'], 'login', 'session', null, $userId, 'Masuk ke aplikasi');

        return ['user' => self::getUserWithRole($pdo, $userId), 'token' => $token];
    }

    public static function logout(PDO $pdo, ?string $token): void
    {
        if (!$token) {
            return;
        }
        $authUser = self::authenticate($pdo, $token);
        $stmt = $pdo->prepare('DELETE FROM user_sessions WHERE token = ?');
        $stmt->execute([$token]);
        if ($authUser) {
            AuditService::record($pdo, (int) $authUser['id'], (string) $authUser['username'], 'logout', 'session', null, (int) $authUser['id'], 'Keluar dari aplikasi');
        }
    }

    /**
     * @return ?array<string, mixed>
     */
    public static function authenticate(PDO $pdo, ?string $token): ?array
    {
        if (!$token || trim($token) === '') {
            return null;
        }
        $stmt = $pdo->prepare(
            "SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > datetime('now', 'localtime') LIMIT 1"
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }
        $user = self::getUserWithRole($pdo, (int) $row['user_id']);
        if (!$user || !$user['is_active']) {
            return null;
        }
        return $user;
    }

    public static function changePassword(PDO $pdo, int $userId, string $currentPassword, string $newPassword): void
    {
        self::validatePassword($newPassword);
        $stmt = $pdo->prepare('SELECT username, password_hash FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) {
            throw new InvalidArgumentException('Akun tidak ditemukan.');
        }
        if (!password_verify($currentPassword, (string) $user['password_hash'])) {
            throw new InvalidArgumentException('Password saat ini tidak sesuai.');
        }
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $upd = $pdo->prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?");
        $upd->execute([$newHash, $userId]);

        AuditService::record($pdo, $userId, (string) $user['username'], 'change_password', 'user', $userId, $userId, 'Mengubah password akun');
    }

    /**
     * @param array<string, mixed> $authUser
     */
    public static function hasPermission(array $authUser, string $permission): bool
    {
        return !empty($authUser['permissions'][$permission]);
    }

    /**
     * @return ?array<string, mixed>
     */
    public static function getUserWithRole(PDO $pdo, int $userId): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT u.id, u.username, u.full_name, u.role_id, u.is_active, u.created_at, u.updated_at,
                    r.name AS role_name, r.description AS role_description,
                    r.can_manage_users, r.can_manage_roles, r.can_view_all_users_data, r.can_view_audit_logs
             FROM users u
             INNER JOIN roles r ON r.id = u.role_id
             WHERE u.id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            return null;
        }

        return [
            'id' => (int) $r['id'],
            'username' => (string) $r['username'],
            'full_name' => (string) $r['full_name'],
            'role_id' => (int) $r['role_id'],
            'role_name' => (string) $r['role_name'],
            'role_description' => (string) $r['role_description'],
            'is_active' => (int) $r['is_active'] === 1,
            'permissions' => [
                'can_manage_users' => (int) $r['can_manage_users'] === 1,
                'can_manage_roles' => (int) $r['can_manage_roles'] === 1,
                'can_view_all_users_data' => (int) $r['can_view_all_users_data'] === 1,
                'can_view_audit_logs' => (int) $r['can_view_audit_logs'] === 1,
            ],
            'created_at' => (string) $r['created_at'],
            'updated_at' => (string) $r['updated_at'],
        ];
    }

    public static function createSession(PDO $pdo, int $userId): string
    {
        // Prune expired sessions opportunistically
        $pdo->exec("DELETE FROM user_sessions WHERE expires_at <= datetime('now', 'localtime')");
        $token = bin2hex(random_bytes(32));
        $expires = (new DateTimeImmutable('+' . self::SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');
        $stmt = $pdo->prepare('INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)');
        $stmt->execute([$token, $userId, $expires]);
        return $token;
    }
}
