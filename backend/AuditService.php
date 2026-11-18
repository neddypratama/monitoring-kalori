<?php
declare(strict_types=1);

final class AuditService
{
    public static function record(
        PDO $pdo,
        ?int $userId,
        string $usernameSnapshot,
        string $action,
        string $entityType,
        ?int $entityId = null,
        ?int $targetUserId = null,
        string $details = ''
    ): void {
        $stmt = $pdo->prepare(
            'INSERT INTO audit_logs (user_id, username_snapshot, action, entity_type, entity_id, target_user_id, details)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId,
            $usernameSnapshot,
            $action,
            $entityType,
            $entityId,
            $targetUserId,
            $details,
        ]);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<int, array<string, mixed>>
     */
    public static function listLogs(PDO $pdo, array $filters = []): array
    {
        $sql = 'SELECT a.*, u.full_name AS actor_full_name, tu.username AS target_username
                FROM audit_logs a
                LEFT JOIN users u ON u.id = a.user_id
                LEFT JOIN users tu ON tu.id = a.target_user_id
                WHERE 1=1';
        $params = [];

        if (!empty($filters['user_id'])) {
            $sql .= ' AND a.user_id = ?';
            $params[] = (int) $filters['user_id'];
        }
        if (!empty($filters['action']) && $filters['action'] !== 'all') {
            $sql .= ' AND a.action = ?';
            $params[] = (string) $filters['action'];
        }
        if (!empty($filters['entity_type']) && $filters['entity_type'] !== 'all') {
            $sql .= ' AND a.entity_type = ?';
            $params[] = (string) $filters['entity_type'];
        }
        if (!empty($filters['q'])) {
            $q = '%' . trim((string) $filters['q']) . '%';
            $sql .= ' AND (LOWER(a.username_snapshot) LIKE LOWER(?) OR LOWER(a.details) LIKE LOWER(?) OR LOWER(a.action) LIKE LOWER(?))';
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        $limit = isset($filters['limit']) ? max(1, min(500, (int) $filters['limit'])) : 150;
        $sql .= " ORDER BY a.id DESC LIMIT {$limit}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static function (array $r): array {
            return [
                'id' => (int) $r['id'],
                'user_id' => $r['user_id'] !== null ? (int) $r['user_id'] : null,
                'username_snapshot' => (string) $r['username_snapshot'],
                'actor_full_name' => $r['actor_full_name'] !== null ? (string) $r['actor_full_name'] : null,
                'action' => (string) $r['action'],
                'entity_type' => (string) $r['entity_type'],
                'entity_id' => $r['entity_id'] !== null ? (int) $r['entity_id'] : null,
                'target_user_id' => $r['target_user_id'] !== null ? (int) $r['target_user_id'] : null,
                'target_username' => $r['target_username'] !== null ? (string) $r['target_username'] : null,
                'details' => (string) $r['details'],
                'created_at' => (string) $r['created_at'],
            ];
        }, $rows);
    }
}
