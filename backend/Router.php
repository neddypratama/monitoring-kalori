<?php
declare(strict_types=1);

require_once __DIR__ . '/Calculators.php';
require_once __DIR__ . '/AnalyticsService.php';
require_once __DIR__ . '/AuthService.php';
require_once __DIR__ . '/AuditService.php';
require_once __DIR__ . '/OpenFoodFactsService.php';

final class Router
{
    /**
     * @param array<string, mixed> $query
     * @param array<string, mixed> $body
     * @return array{status: int, payload: array{ok: bool, data?: mixed, error?: string}, session_token?: string, clear_session?: bool}
     */
    public static function handle(PDO $pdo, string $method, string $route, array $query, array $body, ?string $token = null): array
    {
        $method = strtoupper($method);
        $route = trim($route, '/');

        try {
            // Public auth routes
            if ($route === 'auth/login') {
                return self::handleLogin($pdo, $method, $body);
            }
            if ($route === 'auth/register') {
                return self::handleRegister($pdo, $method, $body);
            }
            if ($route === 'auth/logout') {
                return self::handleLogout($pdo, $method, $token);
            }
            if ($route === 'auth/me') {
                $user = AuthService::authenticate($pdo, $token);
                return self::ok(['authenticated' => $user !== null, 'user' => $user]);
            }

            // All other routes require authenticated session
            $authUser = AuthService::authenticate($pdo, $token);
            if (!$authUser) {
                return self::fail(401, 'Sesi tidak ditemukan atau sudah berakhir. Silakan masuk terlebih dahulu.');
            }
            $userId = (int) $authUser['id'];

            return match ($route) {
                'auth/change-password' => self::handleChangePassword($pdo, $method, $authUser, $body),
                'profile' => self::handleProfile($pdo, $method, $authUser, $body),
                'foods' => self::handleFoods($pdo, $method, $authUser, $query, $body),
                'foods/favorite' => self::handleToggleFavorite($pdo, $method, $authUser, $query, 'food'),
                'foods/openfoodfacts' => self::handleOpenFoodFactsSearch($method, $query),
                'activities' => self::handleActivities($pdo, $method, $authUser, $query, $body),
                'activities/favorite' => self::handleToggleFavorite($pdo, $method, $authUser, $query, 'activity'),
                'logs/day' => self::handleLogsDay($pdo, $method, $userId, $query),
                'food-logs' => self::handleFoodLogs($pdo, $method, $authUser, $query, $body),
                'activity-logs' => self::handleActivityLogs($pdo, $method, $authUser, $query, $body),
                'weight-logs' => self::handleWeightLogs($pdo, $method, $authUser, $query, $body),
                'dashboard' => self::handleDashboard($pdo, $method, $userId, $query),
                'export' => self::handleExport($pdo, $method, $authUser),
                'admin/roles' => self::handleAdminRoles($pdo, $method, $authUser, $query, $body),
                'admin/users' => self::handleAdminUsers($pdo, $method, $authUser, $query, $body),
                'admin/user-overview' => self::handleAdminUserOverview($pdo, $method, $authUser, $query),
                'admin/audit-logs' => self::handleAdminAuditLogs($pdo, $method, $authUser, $query),
                default => self::fail(404, "Endpoint '{$route}' tidak ditemukan."),
            };
        } catch (InvalidArgumentException $e) {
            return self::fail(400, $e->getMessage());
        } catch (Throwable $e) {
            return self::fail(500, 'Terjadi kesalahan server: ' . $e->getMessage());
        }
    }

    private static function ok(mixed $data, int $status = 200, array $extra = []): array
    {
        return array_merge(['status' => $status, 'payload' => ['ok' => true, 'data' => $data]], $extra);
    }

    private static function fail(int $status, string $error): array
    {
        return ['status' => $status, 'payload' => ['ok' => false, 'error' => $error]];
    }

    private static function requirePermission(array $authUser, string $permission): ?array
    {
        if (!AuthService::hasPermission($authUser, $permission)) {
            return self::fail(403, 'Anda tidak memiliki izin untuk mengakses fitur ini.');
        }
        return null;
    }

    private static function handleLogin(PDO $pdo, string $method, array $body): array
    {
        if ($method !== 'POST') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $res = AuthService::login($pdo, (string) ($body['username'] ?? ''), (string) ($body['password'] ?? ''));
        return self::ok(['user' => $res['user']], 200, ['session_token' => $res['token']]);
    }

    private static function handleRegister(PDO $pdo, string $method, array $body): array
    {
        if ($method !== 'POST') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $res = AuthService::register(
            $pdo,
            (string) ($body['username'] ?? ''),
            (string) ($body['full_name'] ?? ''),
            (string) ($body['password'] ?? '')
        );
        return self::ok(['user' => $res['user']], 201, ['session_token' => $res['token']]);
    }

    private static function handleLogout(PDO $pdo, string $method, ?string $token): array
    {
        if ($method !== 'POST') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        AuthService::logout($pdo, $token);
        return self::ok(['logged_out' => true], 200, ['clear_session' => true]);
    }

    private static function handleChangePassword(PDO $pdo, string $method, array $authUser, array $body): array
    {
        if ($method !== 'POST') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        AuthService::changePassword(
            $pdo,
            (int) $authUser['id'],
            (string) ($body['current_password'] ?? ''),
            (string) ($body['new_password'] ?? '')
        );
        return self::ok(['changed' => true]);
    }

    private static function validateDate(?string $date, string $fallback = ''): string
    {
        $val = trim((string) ($date ?? ''));
        if ($val === '' && $fallback !== '') {
            return $fallback;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
            throw new InvalidArgumentException('Format tanggal tidak valid. Gunakan YYYY-MM-DD.');
        }
        $dt = DateTimeImmutable::createFromFormat('Y-m-d', $val);
        if (!$dt || $dt->format('Y-m-d') !== $val) {
            throw new InvalidArgumentException('Tanggal tidak valid.');
        }
        $year = (int) $dt->format('Y');
        $maxYear = (int) date('Y') + 2;
        if ($year < 2000 || $year > $maxYear) {
            throw new InvalidArgumentException("Tahun tanggal harus antara 2000 hingga {$maxYear}.");
        }
        return $val;
    }

    private static function requireProfile(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new InvalidArgumentException('Profil belum diisi. Silakan lengkapi profil terlebih dahulu.');
        }
        return $row;
    }

    private static function handleProfile(PDO $pdo, string $method, array $authUser, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'GET') {
            $stmt = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1');
            $stmt->execute([$userId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                return self::ok(['exists' => false, 'profile' => null, 'metrics' => null]);
            }
            return self::ok([
                'exists' => true,
                'profile' => self::castProfile($row),
                'metrics' => AnalyticsService::getCurrentMetrics($pdo, $userId, $row),
            ]);
        }

        if ($method !== 'POST' && $method !== 'PUT') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }

        $stmt = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        $name = trim((string) ($body['name'] ?? ($existing['name'] ?? $authUser['full_name'] ?? '')));
        $gender = (string) ($body['gender'] ?? ($existing['gender'] ?? ''));
        $ageNum = Calculators::parseNumber($body['age'] ?? ($existing['age'] ?? null));
        $heightCm = Calculators::parseNumber($body['height_cm'] ?? ($existing['height_cm'] ?? null));
        $initialWeight = Calculators::parseNumber($body['initial_weight_kg'] ?? ($existing['initial_weight_kg'] ?? null));
        $targetWeightRaw = array_key_exists('target_weight_kg', $body)
            ? $body['target_weight_kg']
            : ($existing['target_weight_kg'] ?? null);
        $targetWeight = ($targetWeightRaw === null || $targetWeightRaw === '') ? null : Calculators::parseNumber($targetWeightRaw);
        $activityLevel = (string) ($body['activity_level'] ?? ($existing['activity_level'] ?? 'sedentary'));
        $goalType = (string) ($body['goal_type'] ?? ($existing['goal_type'] ?? 'lose'));

        if ($gender !== 'male' && $gender !== 'female') {
            throw new InvalidArgumentException('Pilih jenis kelamin (Laki-laki atau Perempuan).');
        }
        if ($ageNum === null || (int) $ageNum < 10 || (int) $ageNum > 110) {
            throw new InvalidArgumentException('Usia harus antara 10 hingga 110 tahun.');
        }
        if ($heightCm === null || $heightCm < 80 || $heightCm > 250) {
            throw new InvalidArgumentException('Tinggi badan harus antara 80 hingga 250 cm.');
        }
        if ($initialWeight === null || $initialWeight < 20 || $initialWeight > 300) {
            throw new InvalidArgumentException('Berat badan harus antara 20 hingga 300 kg.');
        }
        if ($targetWeight !== null && ($targetWeight < 20 || $targetWeight > 300)) {
            throw new InvalidArgumentException('Target berat badan harus antara 20 hingga 300 kg.');
        }

        $age = (int) round($ageNum);
        $bmr = Calculators::calculateBmr($initialWeight, $heightCm, $age, $gender);
        $tdee = Calculators::calculateTdee($bmr, $activityLevel);
        Calculators::calculateRecommendedCalories($tdee, $goalType, $gender);

        $isManual = !empty($body['is_manual_target']) ? 1 : 0;
        $manualTarget = null;
        if ($isManual === 1) {
            $parsedTarget = Calculators::parseNumber($body['daily_calorie_target'] ?? null);
            if ($parsedTarget === null || $parsedTarget < 800 || $parsedTarget > 8000) {
                throw new InvalidArgumentException('Target kalori manual harus antara 800 hingga 8.000 kkal.');
            }
            $manualTarget = (int) round($parsedTarget);
        }

        if (!$existing) {
            $ins = $pdo->prepare(
                'INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, daily_calorie_target, is_manual_target)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $ins->execute([$userId, $name, $gender, $age, $heightCm, $initialWeight, $targetWeight, $activityLevel, $goalType, $manualTarget, $isManual]);

            $today = self::validateDate((string) ($body['initial_date'] ?? ''), date('Y-m-d'));
            $wStmt = $pdo->prepare(
                "INSERT INTO weight_logs (user_id, log_date, weight_kg, notes) VALUES (?, ?, ?, 'Berat badan awal program')
                 ON CONFLICT(user_id, log_date) DO NOTHING"
            );
            $wStmt->execute([$userId, $today, round($initialWeight, 2)]);

            AuditService::record($pdo, $userId, (string) $authUser['username'], 'create_profile', 'profile', $userId, $userId, "BB {$initialWeight} kg, TB {$heightCm} cm");
        } else {
            $upd = $pdo->prepare(
                "UPDATE user_profile
                 SET name = ?, gender = ?, age = ?, height_cm = ?, initial_weight_kg = ?, target_weight_kg = ?,
                     activity_level = ?, goal_type = ?, daily_calorie_target = ?, is_manual_target = ?,
                     updated_at = datetime('now', 'localtime')
                 WHERE user_id = ?"
            );
            $upd->execute([$name, $gender, $age, $heightCm, $initialWeight, $targetWeight, $activityLevel, $goalType, $manualTarget, $isManual, $userId]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'update_profile', 'profile', $userId, $userId, "Perbarui profil diet (BB awal {$initialWeight} kg, TB {$heightCm} cm)");
        }

        $get = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1');
        $get->execute([$userId]);
        $saved = $get->fetch(PDO::FETCH_ASSOC);
        return self::ok([
            'exists' => true,
            'profile' => self::castProfile($saved),
            'metrics' => AnalyticsService::getCurrentMetrics($pdo, $userId, $saved),
        ]);
    }

    private static function handleFoods(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'GET') {
            $sql = "SELECT f.*, CASE WHEN uf.item_id IS NOT NULL THEN 1 ELSE 0 END AS user_fav
                    FROM foods f
                    LEFT JOIN user_favorites uf ON uf.user_id = ? AND uf.item_type = 'food' AND uf.item_id = f.id
                    WHERE (f.is_custom = 0 OR f.user_id = ?)";
            $params = [$userId, $userId];
            if (!empty($query['q'])) {
                $sql .= ' AND LOWER(f.name) LIKE LOWER(?)';
                $params[] = '%' . trim((string) $query['q']) . '%';
            }
            if (!empty($query['category']) && $query['category'] !== 'Semua') {
                $sql .= ' AND f.category = ?';
                $params[] = (string) $query['category'];
            }
            if (!empty($query['favorites']) && (string) $query['favorites'] === '1') {
                $sql .= ' AND uf.item_id IS NOT NULL';
            }
            $sql .= ' ORDER BY user_fav DESC, f.is_custom DESC, f.name ASC';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = array_map([self::class, 'castFood'], $stmt->fetchAll(PDO::FETCH_ASSOC));
            return self::ok($rows);
        }

        if ($method === 'POST') {
            $data = self::validateFoodBody($body);
            $stmt = $pdo->prepare(
                'INSERT INTO foods (user_id, name, category, default_unit, serving_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_custom, is_favorite)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)'
            );
            $stmt->execute([
                $userId, $data['name'], $data['category'], $data['default_unit'], $data['serving_grams'],
                $data['calories_per_100g'], $data['protein_per_100g'], $data['carbs_per_100g'], $data['fat_per_100g'],
            ]);
            $id = (int) $pdo->lastInsertId();
            if (!empty($body['is_favorite'])) {
                $pdo->prepare("INSERT OR IGNORE INTO user_favorites (user_id, item_type, item_id) VALUES (?, 'food', ?)")->execute([$userId, $id]);
            }
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'create_custom_food', 'food', $id, $userId, "Tambah makanan kustom: {$data['name']}");
            return self::ok(self::fetchFoodForUser($pdo, $id, $userId), 201);
        }

        if ($method === 'PUT') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'foods', $id, 'Makanan');
            if ((int) $existing['is_custom'] !== 1 || (int) $existing['user_id'] !== $userId) {
                throw new InvalidArgumentException('Makanan bawaan atau milik user lain tidak dapat diubah.');
            }
            $data = self::validateFoodBody($body);
            $stmt = $pdo->prepare(
                'UPDATE foods SET name = ?, category = ?, default_unit = ?, serving_grams = ?,
                 calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?
                 WHERE id = ? AND user_id = ?'
            );
            $stmt->execute([
                $data['name'], $data['category'], $data['default_unit'], $data['serving_grams'],
                $data['calories_per_100g'], $data['protein_per_100g'], $data['carbs_per_100g'], $data['fat_per_100g'],
                $id, $userId,
            ]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'update_custom_food', 'food', $id, $userId, "Ubah makanan kustom: {$data['name']}");
            return self::ok(self::fetchFoodForUser($pdo, $id, $userId));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'foods', $id, 'Makanan');
            if ((int) $existing['is_custom'] !== 1 || (int) $existing['user_id'] !== $userId) {
                throw new InvalidArgumentException('Makanan bawaan katalog atau milik user lain tidak dapat dihapus.');
            }
            $pdo->prepare('DELETE FROM foods WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
            $pdo->prepare("DELETE FROM user_favorites WHERE item_type = 'food' AND item_id = ?")->execute([$id]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'delete_custom_food', 'food', $id, $userId, "Hapus makanan kustom: {$existing['name']}");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleOpenFoodFactsSearch(string $method, array $query): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $q = (string) ($query['q'] ?? '');
        try {
            $items = OpenFoodFactsService::searchProducts($q);
            return self::ok($items);
        } catch (RuntimeException $e) {
            return self::fail(502, $e->getMessage());
        }
    }

    private static function handleActivities(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'GET') {
            $sql = "SELECT a.*, CASE WHEN uf.item_id IS NOT NULL THEN 1 ELSE 0 END AS user_fav
                    FROM activities a
                    LEFT JOIN user_favorites uf ON uf.user_id = ? AND uf.item_type = 'activity' AND uf.item_id = a.id
                    WHERE (a.is_custom = 0 OR a.user_id = ?)";
            $params = [$userId, $userId];
            if (!empty($query['q'])) {
                $sql .= ' AND LOWER(a.name) LIKE LOWER(?)';
                $params[] = '%' . trim((string) $query['q']) . '%';
            }
            if (!empty($query['category']) && $query['category'] !== 'Semua') {
                $sql .= ' AND a.category = ?';
                $params[] = (string) $query['category'];
            }
            if (!empty($query['favorites']) && (string) $query['favorites'] === '1') {
                $sql .= ' AND uf.item_id IS NOT NULL';
            }
            $sql .= ' ORDER BY user_fav DESC, a.is_custom DESC, a.name ASC';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = array_map([self::class, 'castActivity'], $stmt->fetchAll(PDO::FETCH_ASSOC));
            return self::ok($rows);
        }

        if ($method === 'POST') {
            $data = self::validateActivityBody($body);
            $stmt = $pdo->prepare(
                'INSERT INTO activities (user_id, name, category, met, supports_distance, default_speed_kmh, is_custom, is_favorite)
                 VALUES (?, ?, ?, ?, ?, ?, 1, 0)'
            );
            $stmt->execute([$userId, $data['name'], $data['category'], $data['met'], $data['supports_distance'], $data['default_speed_kmh']]);
            $id = (int) $pdo->lastInsertId();
            if (!empty($body['is_favorite'])) {
                $pdo->prepare("INSERT OR IGNORE INTO user_favorites (user_id, item_type, item_id) VALUES (?, 'activity', ?)")->execute([$userId, $id]);
            }
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'create_custom_activity', 'activity', $id, $userId, "Tambah aktivitas kustom: {$data['name']}");
            return self::ok(self::fetchActivityForUser($pdo, $id, $userId), 201);
        }

        if ($method === 'PUT') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'activities', $id, 'Aktivitas');
            if ((int) $existing['is_custom'] !== 1 || (int) $existing['user_id'] !== $userId) {
                throw new InvalidArgumentException('Aktivitas bawaan atau milik user lain tidak dapat diubah.');
            }
            $data = self::validateActivityBody($body);
            $stmt = $pdo->prepare(
                'UPDATE activities SET name = ?, category = ?, met = ?, supports_distance = ?, default_speed_kmh = ? WHERE id = ? AND user_id = ?'
            );
            $stmt->execute([$data['name'], $data['category'], $data['met'], $data['supports_distance'], $data['default_speed_kmh'], $id, $userId]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'update_custom_activity', 'activity', $id, $userId, "Ubah aktivitas kustom: {$data['name']}");
            return self::ok(self::fetchActivityForUser($pdo, $id, $userId));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'activities', $id, 'Aktivitas');
            if ((int) $existing['is_custom'] !== 1 || (int) $existing['user_id'] !== $userId) {
                throw new InvalidArgumentException('Aktivitas bawaan katalog atau milik user lain tidak dapat dihapus.');
            }
            $pdo->prepare('DELETE FROM activities WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
            $pdo->prepare("DELETE FROM user_favorites WHERE item_type = 'activity' AND item_id = ?")->execute([$id]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'delete_custom_activity', 'activity', $id, $userId, "Hapus aktivitas kustom: {$existing['name']}");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleToggleFavorite(PDO $pdo, string $method, array $authUser, array $query, string $itemType): array
    {
        if ($method !== 'POST') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $userId = (int) $authUser['id'];
        $id = (int) ($query['id'] ?? 0);
        $table = $itemType === 'food' ? 'foods' : 'activities';
        $label = $itemType === 'food' ? 'Makanan' : 'Aktivitas';
        $row = self::findRow($pdo, $table, $id, $label);
        if ((int) $row['is_custom'] === 1 && (int) $row['user_id'] !== $userId) {
            throw new InvalidArgumentException("{$label} tidak ditemukan.");
        }

        $chk = $pdo->prepare('SELECT 1 FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?');
        $chk->execute([$userId, $itemType, $id]);
        if ($chk->fetchColumn()) {
            $pdo->prepare('DELETE FROM user_favorites WHERE user_id = ? AND item_type = ? AND item_id = ?')->execute([$userId, $itemType, $id]);
        } else {
            $pdo->prepare('INSERT INTO user_favorites (user_id, item_type, item_id) VALUES (?, ?, ?)')->execute([$userId, $itemType, $id]);
        }

        return self::ok(
            $itemType === 'food'
                ? self::fetchFoodForUser($pdo, $id, $userId)
                : self::fetchActivityForUser($pdo, $id, $userId)
        );
    }

    private static function handleLogsDay(PDO $pdo, string $method, int $userId, array $query): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $profile = self::requireProfile($pdo, $userId);
        $date = self::validateDate((string) ($query['date'] ?? ''), date('Y-m-d'));

        $fStmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? AND log_date = ? ORDER BY id ASC');
        $fStmt->execute([$userId, $date]);
        $foodLogs = array_map([self::class, 'castFoodLog'], $fStmt->fetchAll(PDO::FETCH_ASSOC));

        $aStmt = $pdo->prepare('SELECT * FROM activity_logs WHERE user_id = ? AND log_date = ? ORDER BY id ASC');
        $aStmt->execute([$userId, $date]);
        $actLogs = array_map([self::class, 'castActivityLog'], $aStmt->fetchAll(PDO::FETCH_ASSOC));

        $wStmt = $pdo->prepare('SELECT * FROM weight_logs WHERE user_id = ? AND log_date = ? LIMIT 1');
        $wStmt->execute([$userId, $date]);
        $wRow = $wStmt->fetch(PDO::FETCH_ASSOC);

        return self::ok([
            'date' => $date,
            'summary' => AnalyticsService::getDailySummary($pdo, $userId, $profile, $date),
            'food_logs' => $foodLogs,
            'activity_logs' => $actLogs,
            'weight_log' => $wRow ? self::castWeightLog($wRow) : null,
        ]);
    }

    private static function handleFoodLogs(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'POST') {
            self::requireProfile($pdo, $userId);
            $entry = self::prepareFoodLogData($pdo, $userId, $body);
            $stmt = $pdo->prepare(
                'INSERT INTO food_logs (user_id, log_date, meal_type, food_id, food_name, quantity, unit, calories, protein, carbs, fat, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId, $entry['log_date'], $entry['meal_type'], $entry['food_id'], $entry['food_name'],
                $entry['quantity'], $entry['unit'], $entry['calories'],
                $entry['protein'], $entry['carbs'], $entry['fat'], $entry['notes'],
            ]);
            $id = (int) $pdo->lastInsertId();
            $row = self::findUserOwnedRow($pdo, 'food_logs', $id, $userId, 'Catatan makanan');
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'create_food_log', 'food_log', $id, $userId, "{$entry['food_name']} ({$entry['calories']} kkal, {$entry['log_date']})");
            return self::ok(self::castFoodLog($row), 201);
        }

        if ($method === 'PUT') {
            self::requireProfile($pdo, $userId);
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            self::findUserOwnedRow($pdo, 'food_logs', $id, $userId, 'Catatan makanan');
            $entry = self::prepareFoodLogData($pdo, $userId, $body);
            $stmt = $pdo->prepare(
                'UPDATE food_logs
                 SET log_date = ?, meal_type = ?, food_id = ?, food_name = ?, quantity = ?, unit = ?,
                     calories = ?, protein = ?, carbs = ?, fat = ?, notes = ?
                 WHERE id = ? AND user_id = ?'
            );
            $stmt->execute([
                $entry['log_date'], $entry['meal_type'], $entry['food_id'], $entry['food_name'],
                $entry['quantity'], $entry['unit'], $entry['calories'],
                $entry['protein'], $entry['carbs'], $entry['fat'], $entry['notes'], $id, $userId,
            ]);
            $row = self::findUserOwnedRow($pdo, 'food_logs', $id, $userId, 'Catatan makanan');
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'update_food_log', 'food_log', $id, $userId, "{$entry['food_name']} ({$entry['calories']} kkal)");
            return self::ok(self::castFoodLog($row));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findUserOwnedRow($pdo, 'food_logs', $id, $userId, 'Catatan makanan');
            $pdo->prepare('DELETE FROM food_logs WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'delete_food_log', 'food_log', $id, $userId, "Hapus {$existing['food_name']} ({$existing['log_date']})");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleActivityLogs(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'POST') {
            $profile = self::requireProfile($pdo, $userId);
            $entry = self::prepareActivityLogData($pdo, $userId, $profile, $body);
            $stmt = $pdo->prepare(
                'INSERT INTO activity_logs (user_id, log_date, activity_id, activity_name, input_value, input_unit, duration_minutes, distance_meters, weight_kg_used, calories_burned, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId, $entry['log_date'], $entry['activity_id'], $entry['activity_name'],
                $entry['input_value'], $entry['input_unit'], $entry['duration_minutes'],
                $entry['distance_meters'], $entry['weight_kg_used'], $entry['calories_burned'], $entry['notes'],
            ]);
            $id = (int) $pdo->lastInsertId();
            $row = self::findUserOwnedRow($pdo, 'activity_logs', $id, $userId, 'Catatan aktivitas');
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'create_activity_log', 'activity_log', $id, $userId, "{$entry['activity_name']} {$entry['input_value']} {$entry['input_unit']} (-{$entry['calories_burned']} kkal)");
            return self::ok(self::castActivityLog($row), 201);
        }

        if ($method === 'PUT') {
            $profile = self::requireProfile($pdo, $userId);
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            self::findUserOwnedRow($pdo, 'activity_logs', $id, $userId, 'Catatan aktivitas');
            $entry = self::prepareActivityLogData($pdo, $userId, $profile, $body);
            $stmt = $pdo->prepare(
                'UPDATE activity_logs
                 SET log_date = ?, activity_id = ?, activity_name = ?, input_value = ?, input_unit = ?,
                     duration_minutes = ?, distance_meters = ?, weight_kg_used = ?, calories_burned = ?, notes = ?
                 WHERE id = ? AND user_id = ?'
            );
            $stmt->execute([
                $entry['log_date'], $entry['activity_id'], $entry['activity_name'],
                $entry['input_value'], $entry['input_unit'], $entry['duration_minutes'],
                $entry['distance_meters'], $entry['weight_kg_used'], $entry['calories_burned'], $entry['notes'], $id, $userId,
            ]);
            $row = self::findUserOwnedRow($pdo, 'activity_logs', $id, $userId, 'Catatan aktivitas');
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'update_activity_log', 'activity_log', $id, $userId, "{$entry['activity_name']} (-{$entry['calories_burned']} kkal)");
            return self::ok(self::castActivityLog($row));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findUserOwnedRow($pdo, 'activity_logs', $id, $userId, 'Catatan aktivitas');
            $pdo->prepare('DELETE FROM activity_logs WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'delete_activity_log', 'activity_log', $id, $userId, "Hapus {$existing['activity_name']} ({$existing['log_date']})");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleWeightLogs(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        $userId = (int) $authUser['id'];
        if ($method === 'GET') {
            $stmt = $pdo->prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY log_date DESC');
            $stmt->execute([$userId]);
            return self::ok(array_map([self::class, 'castWeightLog'], $stmt->fetchAll(PDO::FETCH_ASSOC)));
        }

        if ($method === 'POST') {
            self::requireProfile($pdo, $userId);
            $date = self::validateDate((string) ($body['log_date'] ?? ''), date('Y-m-d'));
            $weightKg = Calculators::parseNumber($body['weight_kg'] ?? null);
            if ($weightKg === null || $weightKg < 20 || $weightKg > 300) {
                throw new InvalidArgumentException('Berat badan harus antara 20 hingga 300 kg.');
            }
            $notes = trim((string) ($body['notes'] ?? ''));

            $stmt = $pdo->prepare(
                "INSERT INTO weight_logs (user_id, log_date, weight_kg, notes) VALUES (?, ?, ?, ?)
                 ON CONFLICT(user_id, log_date) DO UPDATE SET
                    weight_kg = excluded.weight_kg,
                    notes = excluded.notes,
                    updated_at = datetime('now', 'localtime')"
            );
            $stmt->execute([$userId, $date, round($weightKg, 2), $notes]);

            $get = $pdo->prepare('SELECT * FROM weight_logs WHERE user_id = ? AND log_date = ?');
            $get->execute([$userId, $date]);
            $row = $get->fetch(PDO::FETCH_ASSOC);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'save_weight_log', 'weight_log', (int) $row['id'], $userId, "BB {$row['weight_kg']} kg ({$date})");
            return self::ok(self::castWeightLog($row));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findUserOwnedRow($pdo, 'weight_logs', $id, $userId, 'Catatan berat badan');
            $pdo->prepare('DELETE FROM weight_logs WHERE id = ? AND user_id = ?')->execute([$id, $userId]);
            AuditService::record($pdo, $userId, (string) $authUser['username'], 'delete_weight_log', 'weight_log', $id, $userId, "Hapus BB {$existing['weight_kg']} kg ({$existing['log_date']})");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleDashboard(PDO $pdo, string $method, int $userId, array $query): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $profile = self::requireProfile($pdo, $userId);
        $range = (string) ($query['range'] ?? '7d');
        if (!in_array($range, ['7d', '14d', '30d', 'all'], true)) {
            $range = '7d';
        }
        $today = self::validateDate((string) ($query['date'] ?? ''), date('Y-m-d'));
        return self::ok(AnalyticsService::getDashboardData($pdo, $userId, $profile, $range, $today));
    }

    private static function handleExport(PDO $pdo, string $method, array $authUser): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        $userId = (int) $authUser['id'];
        $pStmt = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ?');
        $pStmt->execute([$userId]);
        $profile = $pStmt->fetch(PDO::FETCH_ASSOC);

        $cfStmt = $pdo->prepare('SELECT * FROM foods WHERE is_custom = 1 AND user_id = ? ORDER BY id ASC');
        $cfStmt->execute([$userId]);
        $caStmt = $pdo->prepare('SELECT * FROM activities WHERE is_custom = 1 AND user_id = ? ORDER BY id ASC');
        $caStmt->execute([$userId]);
        $flStmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC');
        $flStmt->execute([$userId]);
        $alStmt = $pdo->prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC');
        $alStmt->execute([$userId]);
        $wlStmt = $pdo->prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY log_date DESC');
        $wlStmt->execute([$userId]);

        AuditService::record($pdo, $userId, (string) $authUser['username'], 'export_data', 'user', $userId, $userId, 'Ekspor cadangan JSON pribadi');

        return self::ok([
            'app' => 'KaloriKu',
            'exported_at' => date('c'),
            'account' => ['id' => $userId, 'username' => $authUser['username'], 'full_name' => $authUser['full_name']],
            'profile' => $profile ? self::castProfile($profile) : null,
            'custom_foods' => array_map([self::class, 'castFood'], $cfStmt->fetchAll(PDO::FETCH_ASSOC)),
            'custom_activities' => array_map([self::class, 'castActivity'], $caStmt->fetchAll(PDO::FETCH_ASSOC)),
            'food_logs' => array_map([self::class, 'castFoodLog'], $flStmt->fetchAll(PDO::FETCH_ASSOC)),
            'activity_logs' => array_map([self::class, 'castActivityLog'], $alStmt->fetchAll(PDO::FETCH_ASSOC)),
            'weight_logs' => array_map([self::class, 'castWeightLog'], $wlStmt->fetchAll(PDO::FETCH_ASSOC)),
        ]);
    }

    /* ==================== ADMIN: ROLES ==================== */

    private static function handleAdminRoles(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        if ($method === 'GET') {
            if (!AuthService::hasPermission($authUser, 'can_manage_roles') && !AuthService::hasPermission($authUser, 'can_manage_users')) {
                return self::fail(403, 'Anda tidak memiliki izin untuk melihat daftar role.');
            }
            $rows = $pdo->query(
                'SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS user_count
                 FROM roles r ORDER BY r.is_system DESC, r.id ASC'
            )->fetchAll(PDO::FETCH_ASSOC);
            return self::ok(array_map([self::class, 'castRole'], $rows));
        }

        if ($denied = self::requirePermission($authUser, 'can_manage_roles')) {
            return $denied;
        }
        $actorId = (int) $authUser['id'];
        $actorName = (string) $authUser['username'];

        if ($method === 'POST') {
            $name = strtolower(trim((string) ($body['name'] ?? '')));
            if (!preg_match('/^[a-z0-9_-]{2,32}$/', $name)) {
                throw new InvalidArgumentException('Nama role harus 2–32 karakter (huruf kecil, angka, _ atau -).');
            }
            $exists = $pdo->prepare('SELECT id FROM roles WHERE LOWER(name) = LOWER(?) LIMIT 1');
            $exists->execute([$name]);
            if ($exists->fetchColumn()) {
                throw new InvalidArgumentException("Role '{$name}' sudah ada.");
            }
            $desc = trim((string) ($body['description'] ?? ''));
            $pUsers = !empty($body['can_manage_users']) ? 1 : 0;
            $pRoles = !empty($body['can_manage_roles']) ? 1 : 0;
            $pView = !empty($body['can_view_all_users_data']) ? 1 : 0;
            $pLogs = !empty($body['can_view_audit_logs']) ? 1 : 0;

            $stmt = $pdo->prepare(
                'INSERT INTO roles (name, description, can_manage_users, can_manage_roles, can_view_all_users_data, can_view_audit_logs, is_system)
                 VALUES (?, ?, ?, ?, ?, ?, 0)'
            );
            $stmt->execute([$name, $desc, $pUsers, $pRoles, $pView, $pLogs]);
            $id = (int) $pdo->lastInsertId();
            AuditService::record($pdo, $actorId, $actorName, 'create_role', 'role', $id, null, "Buat role baru: {$name}");
            return self::ok(self::fetchRole($pdo, $id), 201);
        }

        if ($method === 'PUT') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'roles', $id, 'Role');
            $name = (int) $existing['is_system'] === 1
                ? (string) $existing['name']
                : strtolower(trim((string) ($body['name'] ?? $existing['name'])));
            if (!preg_match('/^[a-z0-9_-]{2,32}$/', $name)) {
                throw new InvalidArgumentException('Nama role tidak valid.');
            }
            $desc = trim((string) ($body['description'] ?? $existing['description']));

            // System 'admin' role always retains core admin permissions so admins cannot lock themselves out
            if ($existing['name'] === 'admin') {
                $pUsers = 1;
                $pRoles = 1;
                $pView = 1;
                $pLogs = 1;
            } else {
                $pUsers = !empty($body['can_manage_users']) ? 1 : 0;
                $pRoles = !empty($body['can_manage_roles']) ? 1 : 0;
                $pView = !empty($body['can_view_all_users_data']) ? 1 : 0;
                $pLogs = !empty($body['can_view_audit_logs']) ? 1 : 0;
            }

            $stmt = $pdo->prepare(
                'UPDATE roles SET name = ?, description = ?, can_manage_users = ?, can_manage_roles = ?, can_view_all_users_data = ?, can_view_audit_logs = ? WHERE id = ?'
            );
            $stmt->execute([$name, $desc, $pUsers, $pRoles, $pView, $pLogs, $id]);
            AuditService::record($pdo, $actorId, $actorName, 'update_role', 'role', $id, null, "Ubah role: {$name}");
            return self::ok(self::fetchRole($pdo, $id));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'roles', $id, 'Role');
            if ((int) $existing['is_system'] === 1) {
                throw new InvalidArgumentException("Role bawaan '{$existing['name']}' tidak dapat dihapus.");
            }
            $cntStmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE role_id = ?');
            $cntStmt->execute([$id]);
            if ((int) $cntStmt->fetchColumn() > 0) {
                throw new InvalidArgumentException('Role masih digunakan oleh user. Pindahkan role user terlebih dahulu.');
            }
            $pdo->prepare('DELETE FROM roles WHERE id = ?')->execute([$id]);
            AuditService::record($pdo, $actorId, $actorName, 'delete_role', 'role', $id, null, "Hapus role: {$existing['name']}");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    /* ==================== ADMIN: USERS ==================== */

    private static function handleAdminUsers(PDO $pdo, string $method, array $authUser, array $query, array $body): array
    {
        if ($method === 'GET') {
            if (!AuthService::hasPermission($authUser, 'can_manage_users') && !AuthService::hasPermission($authUser, 'can_view_all_users_data')) {
                return self::fail(403, 'Anda tidak memiliki izin untuk melihat daftar user.');
            }
            $today = self::validateDate((string) ($query['date'] ?? ''), date('Y-m-d'));
            $stmt = $pdo->prepare(
                'SELECT u.id, u.username, u.full_name, u.role_id, u.is_active, u.created_at, u.updated_at,
                        r.name AS role_name,
                        p.height_cm, p.initial_weight_kg, p.goal_type,
                        (SELECT weight_kg FROM weight_logs wl WHERE wl.user_id = u.id ORDER BY log_date DESC LIMIT 1) AS latest_weight_kg,
                        (SELECT COALESCE(SUM(calories), 0) FROM food_logs fl WHERE fl.user_id = u.id AND fl.log_date = ?) AS today_calories_in,
                        (SELECT COALESCE(SUM(calories_burned), 0) FROM activity_logs al WHERE al.user_id = u.id AND al.log_date = ?) AS today_calories_burned,
                        (SELECT COUNT(*) FROM food_logs fl2 WHERE fl2.user_id = u.id) AS total_food_logs,
                        (SELECT COUNT(*) FROM activity_logs al2 WHERE al2.user_id = u.id) AS total_activity_logs,
                        (SELECT COUNT(*) FROM weight_logs wl2 WHERE wl2.user_id = u.id) AS total_weight_logs
                 FROM users u
                 INNER JOIN roles r ON r.id = u.role_id
                 LEFT JOIN user_profile p ON p.user_id = u.id
                 ORDER BY u.id ASC'
            );
            $stmt->execute([$today, $today]);
            $rows = array_map(static function (array $r): array {
                return [
                    'id' => (int) $r['id'],
                    'username' => (string) $r['username'],
                    'full_name' => (string) $r['full_name'],
                    'role_id' => (int) $r['role_id'],
                    'role_name' => (string) $r['role_name'],
                    'is_active' => (int) $r['is_active'] === 1,
                    'has_profile' => $r['height_cm'] !== null,
                    'latest_weight_kg' => $r['latest_weight_kg'] !== null
                        ? round((float) $r['latest_weight_kg'], 2)
                        : ($r['initial_weight_kg'] !== null ? round((float) $r['initial_weight_kg'], 2) : null),
                    'goal_type' => $r['goal_type'] !== null ? (string) $r['goal_type'] : null,
                    'today_calories_in' => (int) $r['today_calories_in'],
                    'today_calories_burned' => (int) $r['today_calories_burned'],
                    'total_food_logs' => (int) $r['total_food_logs'],
                    'total_activity_logs' => (int) $r['total_activity_logs'],
                    'total_weight_logs' => (int) $r['total_weight_logs'],
                    'created_at' => (string) $r['created_at'],
                ];
            }, $stmt->fetchAll(PDO::FETCH_ASSOC));
            return self::ok($rows);
        }

        if ($denied = self::requirePermission($authUser, 'can_manage_users')) {
            return $denied;
        }
        $actorId = (int) $authUser['id'];
        $actorName = (string) $authUser['username'];

        if ($method === 'POST') {
            $username = AuthService::validateUsername((string) ($body['username'] ?? ''));
            $password = (string) ($body['password'] ?? '');
            AuthService::validatePassword($password);
            $fullName = trim((string) ($body['full_name'] ?? ''));
            if ($fullName === '') {
                $fullName = $username;
            }
            $roleId = (int) ($body['role_id'] ?? 0);
            $role = self::findRow($pdo, 'roles', $roleId, 'Role');
            $isActive = array_key_exists('is_active', $body) ? (!empty($body['is_active']) ? 1 : 0) : 1;

            $exists = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1');
            $exists->execute([$username]);
            if ($exists->fetchColumn()) {
                throw new InvalidArgumentException("Username '{$username}' sudah terdaftar.");
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (username, full_name, password_hash, role_id, is_active) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$username, $fullName, $hash, $roleId, $isActive]);
            $newId = (int) $pdo->lastInsertId();

            AuditService::record($pdo, $actorId, $actorName, 'create_user', 'user', $newId, $newId, "Admin membuat user '{$username}' (role: {$role['name']})");
            return self::ok(AuthService::getUserWithRole($pdo, $newId), 201);
        }

        if ($method === 'PUT') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            $existing = self::findRow($pdo, 'users', $id, 'User');
            $username = AuthService::validateUsername((string) ($body['username'] ?? $existing['username']));
            $fullName = trim((string) ($body['full_name'] ?? $existing['full_name']));
            if ($fullName === '') {
                $fullName = $username;
            }
            $roleId = (int) ($body['role_id'] ?? $existing['role_id']);
            $role = self::findRow($pdo, 'roles', $roleId, 'Role');
            $isActive = array_key_exists('is_active', $body) ? (!empty($body['is_active']) ? 1 : 0) : (int) $existing['is_active'];

            if ($id === $actorId && $isActive === 0) {
                throw new InvalidArgumentException('Anda tidak dapat menonaktifkan akun Anda sendiri.');
            }
            // Ensure at least one active admin remains
            if ((int) $existing['is_active'] === 1 && ($isActive === 0 || (int) $role['can_manage_users'] === 0)) {
                $chkAdm = $pdo->prepare(
                    'SELECT COUNT(*) FROM users u INNER JOIN roles r ON r.id = u.role_id
                     WHERE u.id != ? AND u.is_active = 1 AND r.can_manage_users = 1 AND r.can_manage_roles = 1'
                );
                $chkAdm->execute([$id]);
                $otherAdmins = (int) $chkAdm->fetchColumn();
                $wasAdmin = self::userHasFullAdmin($pdo, (int) $existing['role_id']);
                if ($wasAdmin && $otherAdmins === 0) {
                    throw new InvalidArgumentException('Harus ada minimal 1 Admin aktif di sistem.');
                }
            }

            $dup = $pdo->prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ? LIMIT 1');
            $dup->execute([$username, $id]);
            if ($dup->fetchColumn()) {
                throw new InvalidArgumentException("Username '{$username}' sudah digunakan oleh akun lain.");
            }

            $newPassword = trim((string) ($body['password'] ?? ''));
            if ($newPassword !== '') {
                AuthService::validatePassword($newPassword);
                $hash = password_hash($newPassword, PASSWORD_DEFAULT);
                $upd = $pdo->prepare(
                    "UPDATE users SET username = ?, full_name = ?, role_id = ?, is_active = ?, password_hash = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
                );
                $upd->execute([$username, $fullName, $roleId, $isActive, $hash, $id]);
            } else {
                $upd = $pdo->prepare(
                    "UPDATE users SET username = ?, full_name = ?, role_id = ?, is_active = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
                );
                $upd->execute([$username, $fullName, $roleId, $isActive, $id]);
            }
            if ($isActive === 0) {
                $pdo->prepare('DELETE FROM user_sessions WHERE user_id = ?')->execute([$id]);
            }

            $detail = "Ubah user '{$username}' (role: {$role['name']}, status: " . ($isActive === 1 ? 'aktif' : 'nonaktif') . ($newPassword !== '' ? ', reset password' : '') . ')';
            AuditService::record($pdo, $actorId, $actorName, 'update_user', 'user', $id, $id, $detail);
            return self::ok(AuthService::getUserWithRole($pdo, $id));
        }

        if ($method === 'DELETE') {
            $id = (int) ($query['id'] ?? $body['id'] ?? 0);
            if ($id === $actorId) {
                throw new InvalidArgumentException('Anda tidak dapat menghapus akun Anda sendiri.');
            }
            $existing = self::findRow($pdo, 'users', $id, 'User');
            if (self::userHasFullAdmin($pdo, (int) $existing['role_id'])) {
                $chkAdm = $pdo->prepare(
                    'SELECT COUNT(*) FROM users u INNER JOIN roles r ON r.id = u.role_id
                     WHERE u.id != ? AND u.is_active = 1 AND r.can_manage_users = 1 AND r.can_manage_roles = 1'
                );
                $chkAdm->execute([$id]);
                if ((int) $chkAdm->fetchColumn() === 0) {
                    throw new InvalidArgumentException('Tidak dapat menghapus Admin aktif terakhir.');
                }
            }
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            AuditService::record($pdo, $actorId, $actorName, 'delete_user', 'user', $id, null, "Hapus user '{$existing['username']}'");
            return self::ok(['deleted' => true, 'id' => $id]);
        }

        return self::fail(405, 'Metode HTTP tidak didukung.');
    }

    private static function handleAdminUserOverview(PDO $pdo, string $method, array $authUser, array $query): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        if ($denied = self::requirePermission($authUser, 'can_view_all_users_data')) {
            return $denied;
        }
        $targetUserId = (int) ($query['user_id'] ?? 0);
        $targetUser = AuthService::getUserWithRole($pdo, $targetUserId);
        if (!$targetUser) {
            throw new InvalidArgumentException('User tidak ditemukan.');
        }

        $range = (string) ($query['range'] ?? '7d');
        if (!in_array($range, ['7d', '14d', '30d', 'all'], true)) {
            $range = '7d';
        }
        $today = self::validateDate((string) ($query['date'] ?? ''), date('Y-m-d'));

        $pStmt = $pdo->prepare('SELECT * FROM user_profile WHERE user_id = ? LIMIT 1');
        $pStmt->execute([$targetUserId]);
        $profile = $pStmt->fetch(PDO::FETCH_ASSOC);

        $flStmt = $pdo->prepare('SELECT * FROM food_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC LIMIT 15');
        $flStmt->execute([$targetUserId]);
        $alStmt = $pdo->prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY log_date DESC, id DESC LIMIT 15');
        $alStmt->execute([$targetUserId]);
        $wlStmt = $pdo->prepare('SELECT * FROM weight_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 15');
        $wlStmt->execute([$targetUserId]);

        return self::ok([
            'user' => $targetUser,
            'has_profile' => $profile !== false,
            'profile' => $profile ? self::castProfile($profile) : null,
            'dashboard' => $profile ? AnalyticsService::getDashboardData($pdo, $targetUserId, $profile, $range, $today) : null,
            'recent_food_logs' => array_map([self::class, 'castFoodLog'], $flStmt->fetchAll(PDO::FETCH_ASSOC)),
            'recent_activity_logs' => array_map([self::class, 'castActivityLog'], $alStmt->fetchAll(PDO::FETCH_ASSOC)),
            'recent_weight_logs' => array_map([self::class, 'castWeightLog'], $wlStmt->fetchAll(PDO::FETCH_ASSOC)),
        ]);
    }

    private static function handleAdminAuditLogs(PDO $pdo, string $method, array $authUser, array $query): array
    {
        if ($method !== 'GET') {
            return self::fail(405, 'Metode HTTP tidak didukung.');
        }
        if ($denied = self::requirePermission($authUser, 'can_view_audit_logs')) {
            return $denied;
        }
        return self::ok(AuditService::listLogs($pdo, $query));
    }

    /* ==================== HELPERS ==================== */

    private static function userHasFullAdmin(PDO $pdo, int $roleId): bool
    {
        $stmt = $pdo->prepare('SELECT can_manage_users, can_manage_roles FROM roles WHERE id = ?');
        $stmt->execute([$roleId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r !== false && (int) $r['can_manage_users'] === 1 && (int) $r['can_manage_roles'] === 1;
    }

    private static function fetchRole(PDO $pdo, int $id): array
    {
        $stmt = $pdo->prepare(
            'SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) AS user_count FROM roles r WHERE r.id = ?'
        );
        $stmt->execute([$id]);
        return self::castRole($stmt->fetch(PDO::FETCH_ASSOC));
    }

    private static function fetchFoodForUser(PDO $pdo, int $id, int $userId): array
    {
        $stmt = $pdo->prepare(
            "SELECT f.*, CASE WHEN uf.item_id IS NOT NULL THEN 1 ELSE 0 END AS user_fav
             FROM foods f
             LEFT JOIN user_favorites uf ON uf.user_id = ? AND uf.item_type = 'food' AND uf.item_id = f.id
             WHERE f.id = ?"
        );
        $stmt->execute([$userId, $id]);
        return self::castFood($stmt->fetch(PDO::FETCH_ASSOC));
    }

    private static function fetchActivityForUser(PDO $pdo, int $id, int $userId): array
    {
        $stmt = $pdo->prepare(
            "SELECT a.*, CASE WHEN uf.item_id IS NOT NULL THEN 1 ELSE 0 END AS user_fav
             FROM activities a
             LEFT JOIN user_favorites uf ON uf.user_id = ? AND uf.item_type = 'activity' AND uf.item_id = a.id
             WHERE a.id = ?"
        );
        $stmt->execute([$userId, $id]);
        return self::castActivity($stmt->fetch(PDO::FETCH_ASSOC));
    }

    private static function prepareFoodLogData(PDO $pdo, int $userId, array $body): array
    {
        $logDate = self::validateDate((string) ($body['log_date'] ?? ''), date('Y-m-d'));
        $mealType = (string) ($body['meal_type'] ?? 'siang');
        if (!in_array($mealType, ['sarapan', 'siang', 'malam', 'camilan'], true)) {
            throw new InvalidArgumentException('Waktu makan harus sarapan, siang, malam, atau camilan.');
        }
        $quantity = Calculators::parseNumber($body['quantity'] ?? 1);
        if ($quantity === null || $quantity <= 0) {
            throw new InvalidArgumentException('Jumlah porsi makanan harus lebih dari 0.');
        }
        $notes = trim((string) ($body['notes'] ?? ''));
        $foodId = isset($body['food_id']) && $body['food_id'] !== '' && $body['food_id'] !== null
            ? (int) $body['food_id']
            : null;

        if ($foodId !== null) {
            $food = self::findRow($pdo, 'foods', $foodId, 'Makanan');
            if ((int) $food['is_custom'] === 1 && (int) $food['user_id'] !== $userId) {
                throw new InvalidArgumentException('Makanan tidak ditemukan.');
            }
            $unit = trim((string) ($body['unit'] ?? $food['default_unit']));
            if ($unit === '') {
                $unit = (string) $food['default_unit'];
            }
            $calc = Calculators::calculateFoodNutrition($food, $quantity, $unit);
            return [
                'log_date' => $logDate,
                'meal_type' => $mealType,
                'food_id' => $foodId,
                'food_name' => (string) $food['name'],
                'quantity' => round($quantity, 2),
                'unit' => $unit,
                'calories' => $calc['calories'],
                'protein' => $calc['protein'],
                'carbs' => $calc['carbs'],
                'fat' => $calc['fat'],
                'notes' => $notes,
            ];
        }

        $foodName = trim((string) ($body['food_name'] ?? ''));
        if ($foodName === '') {
            throw new InvalidArgumentException('Nama makanan tidak boleh kosong.');
        }
        $calories = Calculators::parseNumber($body['calories'] ?? null);
        if ($calories === null || $calories < 0) {
            throw new InvalidArgumentException('Kalori makanan harus angka 0 atau lebih.');
        }
        $unit = trim((string) ($body['unit'] ?? 'porsi'));
        if ($unit === '') {
            $unit = 'porsi';
        }
        $protein = max(0.0, Calculators::parseNumber($body['protein'] ?? 0) ?? 0.0);
        $carbs = max(0.0, Calculators::parseNumber($body['carbs'] ?? 0) ?? 0.0);
        $fat = max(0.0, Calculators::parseNumber($body['fat'] ?? 0) ?? 0.0);

        return [
            'log_date' => $logDate,
            'meal_type' => $mealType,
            'food_id' => null,
            'food_name' => $foodName,
            'quantity' => round($quantity, 2),
            'unit' => $unit,
            'calories' => (int) round($calories),
            'protein' => round($protein, 1),
            'carbs' => round($carbs, 1),
            'fat' => round($fat, 1),
            'notes' => $notes,
        ];
    }

    private static function prepareActivityLogData(PDO $pdo, int $userId, array $profile, array $body): array
    {
        $logDate = self::validateDate((string) ($body['log_date'] ?? ''), date('Y-m-d'));
        $inputValue = Calculators::parseNumber($body['input_value'] ?? null);
        if ($inputValue === null || $inputValue <= 0) {
            throw new InvalidArgumentException('Nilai durasi atau jarak aktivitas harus lebih dari 0.');
        }
        $inputUnit = strtolower(trim((string) ($body['input_unit'] ?? 'menit')));
        if (!in_array($inputUnit, ['m', 'km', 'menit'], true)) {
            throw new InvalidArgumentException('Satuan aktivitas harus m, km, atau menit.');
        }
        $notes = trim((string) ($body['notes'] ?? ''));
        $weightUsed = AnalyticsService::getEffectiveWeightForDate($pdo, $userId, $logDate, (float) $profile['initial_weight_kg']);

        $activityId = isset($body['activity_id']) && $body['activity_id'] !== '' && $body['activity_id'] !== null
            ? (int) $body['activity_id']
            : null;

        if ($activityId !== null) {
            $activity = self::findRow($pdo, 'activities', $activityId, 'Aktivitas');
            if ((int) $activity['is_custom'] === 1 && (int) $activity['user_id'] !== $userId) {
                throw new InvalidArgumentException('Aktivitas tidak ditemukan.');
            }
            $calc = Calculators::calculateActivityCalories($activity, $inputValue, $inputUnit, $weightUsed);
            return [
                'log_date' => $logDate,
                'activity_id' => $activityId,
                'activity_name' => (string) $activity['name'],
                'input_value' => round($inputValue, 2),
                'input_unit' => $inputUnit,
                'duration_minutes' => $calc['duration_minutes'],
                'distance_meters' => $calc['distance_meters'],
                'weight_kg_used' => round($weightUsed, 2),
                'calories_burned' => $calc['calories_burned'],
                'notes' => $notes,
            ];
        }

        $name = trim((string) ($body['activity_name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Nama aktivitas tidak boleh kosong.');
        }
        $caloriesBurned = Calculators::parseNumber($body['calories_burned'] ?? null);
        if ($caloriesBurned === null || $caloriesBurned <= 0) {
            throw new InvalidArgumentException('Kalori terbakar harus lebih dari 0.');
        }
        $durationMinutes = $inputUnit === 'menit' ? $inputValue : 0.0;
        $distanceMeters = match ($inputUnit) {
            'm' => $inputValue,
            'km' => $inputValue * 1000.0,
            default => null,
        };

        return [
            'log_date' => $logDate,
            'activity_id' => null,
            'activity_name' => $name,
            'input_value' => round($inputValue, 2),
            'input_unit' => $inputUnit,
            'duration_minutes' => round($durationMinutes, 2),
            'distance_meters' => $distanceMeters !== null ? round($distanceMeters, 2) : null,
            'weight_kg_used' => round($weightUsed, 2),
            'calories_burned' => (int) round($caloriesBurned),
            'notes' => $notes,
        ];
    }

    private static function validateFoodBody(array $body): array
    {
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Nama makanan tidak boleh kosong.');
        }
        $category = trim((string) ($body['category'] ?? 'Masakan Jadi'));
        $defaultUnit = trim((string) ($body['default_unit'] ?? 'porsi'));
        if ($defaultUnit === '') {
            $defaultUnit = 'porsi';
        }
        $servingGrams = Calculators::parseNumber($body['serving_grams'] ?? 100);
        if ($servingGrams === null || $servingGrams <= 0) {
            throw new InvalidArgumentException('Gram per porsi standar harus lebih dari 0.');
        }
        $cal100 = Calculators::parseNumber($body['calories_per_100g'] ?? null);
        if ($cal100 === null || $cal100 < 0) {
            throw new InvalidArgumentException('Kalori per 100 gram harus 0 atau lebih.');
        }
        $pro = max(0.0, Calculators::parseNumber($body['protein_per_100g'] ?? 0) ?? 0.0);
        $carb = max(0.0, Calculators::parseNumber($body['carbs_per_100g'] ?? 0) ?? 0.0);
        $fat = max(0.0, Calculators::parseNumber($body['fat_per_100g'] ?? 0) ?? 0.0);

        return [
            'name' => $name,
            'category' => $category,
            'default_unit' => $defaultUnit,
            'serving_grams' => round($servingGrams, 1),
            'calories_per_100g' => round($cal100, 1),
            'protein_per_100g' => round($pro, 1),
            'carbs_per_100g' => round($carb, 1),
            'fat_per_100g' => round($fat, 1),
        ];
    }

    private static function validateActivityBody(array $body): array
    {
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            throw new InvalidArgumentException('Nama aktivitas tidak boleh kosong.');
        }
        $category = trim((string) ($body['category'] ?? 'Kardio'));
        $met = Calculators::parseNumber($body['met'] ?? null);
        if ($met === null || $met <= 0 || $met > 25) {
            throw new InvalidArgumentException('Nilai MET harus antara 0,1 hingga 25.');
        }
        $supportsDistance = !empty($body['supports_distance']) ? 1 : 0;
        $speed = null;
        if ($supportsDistance === 1) {
            $speed = Calculators::parseNumber($body['default_speed_kmh'] ?? null);
            if ($speed === null || $speed <= 0 || $speed > 60) {
                throw new InvalidArgumentException('Kecepatan rata-rata (km/jam) wajib diisi (> 0) untuk aktivitas berbasis jarak.');
            }
            $speed = round($speed, 2);
        }

        return [
            'name' => $name,
            'category' => $category,
            'met' => round($met, 2),
            'supports_distance' => $supportsDistance,
            'default_speed_kmh' => $speed,
        ];
    }

    private static function findRow(PDO $pdo, string $table, int $id, string $label): array
    {
        if ($id <= 0) {
            throw new InvalidArgumentException("ID {$label} tidak valid.");
        }
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new InvalidArgumentException("{$label} tidak ditemukan.");
        }
        return $row;
    }

    private static function findUserOwnedRow(PDO $pdo, string $table, int $id, int $userId, string $label): array
    {
        if ($id <= 0) {
            throw new InvalidArgumentException("ID {$label} tidak valid.");
        }
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new InvalidArgumentException("{$label} tidak ditemukan.");
        }
        return $row;
    }

    private static function castProfile(array $r): array
    {
        return [
            'user_id' => (int) $r['user_id'],
            'name' => (string) $r['name'],
            'gender' => (string) $r['gender'],
            'age' => (int) $r['age'],
            'height_cm' => (float) $r['height_cm'],
            'initial_weight_kg' => (float) $r['initial_weight_kg'],
            'target_weight_kg' => $r['target_weight_kg'] !== null ? (float) $r['target_weight_kg'] : null,
            'activity_level' => (string) $r['activity_level'],
            'goal_type' => (string) $r['goal_type'],
            'daily_calorie_target' => $r['daily_calorie_target'] !== null ? (int) $r['daily_calorie_target'] : null,
            'is_manual_target' => (int) $r['is_manual_target'] === 1,
            'created_at' => (string) $r['created_at'],
            'updated_at' => (string) $r['updated_at'],
        ];
    }

    private static function castRole(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'name' => (string) $r['name'],
            'description' => (string) $r['description'],
            'can_manage_users' => (int) $r['can_manage_users'] === 1,
            'can_manage_roles' => (int) $r['can_manage_roles'] === 1,
            'can_view_all_users_data' => (int) $r['can_view_all_users_data'] === 1,
            'can_view_audit_logs' => (int) $r['can_view_audit_logs'] === 1,
            'is_system' => (int) $r['is_system'] === 1,
            'user_count' => isset($r['user_count']) ? (int) $r['user_count'] : 0,
            'created_at' => (string) $r['created_at'],
        ];
    }

    private static function castFood(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'user_id' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
            'name' => (string) $r['name'],
            'category' => (string) $r['category'],
            'default_unit' => (string) $r['default_unit'],
            'serving_grams' => (float) $r['serving_grams'],
            'calories_per_100g' => (float) $r['calories_per_100g'],
            'protein_per_100g' => (float) $r['protein_per_100g'],
            'carbs_per_100g' => (float) $r['carbs_per_100g'],
            'fat_per_100g' => (float) $r['fat_per_100g'],
            'is_custom' => (int) $r['is_custom'] === 1,
            'is_favorite' => isset($r['user_fav']) ? (int) $r['user_fav'] === 1 : (int) $r['is_favorite'] === 1,
        ];
    }

    private static function castActivity(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'user_id' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
            'name' => (string) $r['name'],
            'category' => (string) $r['category'],
            'met' => (float) $r['met'],
            'supports_distance' => (int) $r['supports_distance'] === 1,
            'default_speed_kmh' => $r['default_speed_kmh'] !== null ? (float) $r['default_speed_kmh'] : null,
            'is_custom' => (int) $r['is_custom'] === 1,
            'is_favorite' => isset($r['user_fav']) ? (int) $r['user_fav'] === 1 : (int) $r['is_favorite'] === 1,
        ];
    }

    private static function castFoodLog(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'user_id' => (int) $r['user_id'],
            'log_date' => (string) $r['log_date'],
            'meal_type' => (string) $r['meal_type'],
            'food_id' => $r['food_id'] !== null ? (int) $r['food_id'] : null,
            'food_name' => (string) $r['food_name'],
            'quantity' => (float) $r['quantity'],
            'unit' => (string) $r['unit'],
            'calories' => (int) $r['calories'],
            'protein' => (float) $r['protein'],
            'carbs' => (float) $r['carbs'],
            'fat' => (float) $r['fat'],
            'notes' => (string) $r['notes'],
            'created_at' => (string) $r['created_at'],
        ];
    }

    private static function castActivityLog(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'user_id' => (int) $r['user_id'],
            'log_date' => (string) $r['log_date'],
            'activity_id' => $r['activity_id'] !== null ? (int) $r['activity_id'] : null,
            'activity_name' => (string) $r['activity_name'],
            'input_value' => (float) $r['input_value'],
            'input_unit' => (string) $r['input_unit'],
            'duration_minutes' => (float) $r['duration_minutes'],
            'distance_meters' => $r['distance_meters'] !== null ? (float) $r['distance_meters'] : null,
            'weight_kg_used' => (float) $r['weight_kg_used'],
            'calories_burned' => (int) $r['calories_burned'],
            'notes' => (string) $r['notes'],
            'created_at' => (string) $r['created_at'],
        ];
    }

    private static function castWeightLog(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'user_id' => (int) $r['user_id'],
            'log_date' => (string) $r['log_date'],
            'weight_kg' => (float) $r['weight_kg'],
            'notes' => (string) $r['notes'],
            'created_at' => (string) $r['created_at'],
            'updated_at' => (string) $r['updated_at'],
        ];
    }
}
