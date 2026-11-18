<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/Router.php';

echo "Running RbacIsolationTest...\n";

$pdo = Database::connect(':memory:');

Assert::test('unauthenticated request to protected route returns 401', function () use ($pdo): void {
    $res = Router::handle($pdo, 'GET', 'profile', [], [], null);
    Assert::equals(401, $res['status']);
    Assert::equals(false, $res['payload']['ok']);
});

Assert::test('user isolation: User A and User B have separate profiles, logs, weights, custom foods, and favorites', function () use ($pdo): void {
    // Register User A & User B (created inactive until Admin activates them)
    $regA = Router::handle($pdo, 'POST', 'auth/register', [], [
        'username' => 'user_a', 'full_name' => 'User A', 'password' => 'pass1234',
    ]);
    Assert::equals(201, $regA['status']);
    Assert::equals(true, $regA['payload']['data']['pending_activation']);
    Assert::equals(false, $regA['payload']['data']['user']['is_active']);
    Assert::true(empty($regA['session_token']), 'Pending user must not receive session token');
    $idA = (int) $regA['payload']['data']['user']['id'];

    // User A cannot login before admin activation
    Assert::equals(400, Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'user_a', 'password' => 'pass1234'])['status']);

    $regB = Router::handle($pdo, 'POST', 'auth/register', [], [
        'username' => 'user_b', 'full_name' => 'User B', 'password' => 'pass1234',
    ]);
    Assert::equals(201, $regB['status']);
    $idB = (int) $regB['payload']['data']['user']['id'];

    // Admin activates User A & User B
    $adminLogin = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'admin', 'password' => 'admin123']);
    $adminToken = (string) $adminLogin['session_token'];
    Assert::equals(200, Router::handle($pdo, 'PUT', 'admin/users', ['id' => $idA], ['is_active' => true], $adminToken)['status']);
    Assert::equals(200, Router::handle($pdo, 'PUT', 'admin/users', ['id' => $idB], ['is_active' => true], $adminToken)['status']);

    // Now User A & User B can login
    $tokenA = (string) Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'user_a', 'password' => 'pass1234'])['session_token'];
    $tokenB = (string) Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'user_b', 'password' => 'pass1234'])['session_token'];

    // User A creates profile & logs food + weight
    Router::handle($pdo, 'POST', 'profile', [], [
        'name' => 'A', 'gender' => 'male', 'age' => 25, 'height_cm' => 170,
        'initial_weight_kg' => 75, 'activity_level' => 'sedentary', 'goal_type' => 'lose',
    ], $tokenA);

    $foodA = Router::handle($pdo, 'POST', 'food-logs', [], [
        'log_date' => '2026-11-18', 'meal_type' => 'siang', 'food_name' => 'Menu A', 'quantity' => 1, 'unit' => 'porsi', 'calories' => 500,
    ], $tokenA);
    Assert::equals(201, $foodA['status']);
    Assert::equals($idA, (int) $foodA['payload']['data']['user_id']);
    $foodLogIdA = (int) $foodA['payload']['data']['id'];

    // User B still has exists=false profile
    $profB = Router::handle($pdo, 'GET', 'profile', [], [], $tokenB);
    Assert::equals(false, $profB['payload']['data']['exists']);

    // User B creates own profile & logs same-date weight without UNIQUE conflict
    Router::handle($pdo, 'POST', 'profile', [], [
        'name' => 'B', 'gender' => 'female', 'age' => 24, 'height_cm' => 160,
        'initial_weight_kg' => 55, 'activity_level' => 'sedentary', 'goal_type' => 'maintain',
    ], $tokenB);
    $wB = Router::handle($pdo, 'POST', 'weight-logs', [], ['log_date' => '2026-11-18', 'weight_kg' => 54.8], $tokenB);
    Assert::equals(200, $wB['status']);
    Assert::equals($idB, (int) $wB['payload']['data']['user_id']);

    // User B sees 0 food logs on 2026-11-18 and CANNOT delete User A's food log
    $dayB = Router::handle($pdo, 'GET', 'logs/day', ['date' => '2026-11-18'], [], $tokenB);
    Assert::equals(0, count($dayB['payload']['data']['food_logs']));

    $delOther = Router::handle($pdo, 'DELETE', 'food-logs', ['id' => $foodLogIdA], [], $tokenB);
    Assert::equals(400, $delOther['status']);

    // User A creates custom food -> User B does NOT see it
    $customA = Router::handle($pdo, 'POST', 'foods', [], [
        'name' => 'Rahasia A', 'category' => 'Lauk', 'default_unit' => 'porsi', 'serving_grams' => 100, 'calories_per_100g' => 200,
    ], $tokenA);
    Assert::equals(201, $customA['status']);
    $foodsB = Router::handle($pdo, 'GET', 'foods', ['q' => 'Rahasia A'], [], $tokenB);
    Assert::equals(0, count($foodsB['payload']['data']));
});

Assert::test('RBAC: standard user gets 403 on admin routes; admin manages roles, users, user overview, and audit logs', function () use ($pdo): void {
    // Login as standard user_a -> 403 on admin endpoints
    $loginA = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'user_a', 'password' => 'pass1234']);
    $tokenA = $loginA['session_token'];
    Assert::equals(403, Router::handle($pdo, 'GET', 'admin/users', [], [], $tokenA)['status']);
    Assert::equals(403, Router::handle($pdo, 'GET', 'admin/roles', [], [], $tokenA)['status']);
    Assert::equals(403, Router::handle($pdo, 'GET', 'admin/audit-logs', [], [], $tokenA)['status']);

    // Login as default admin
    $loginAdmin = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'admin', 'password' => 'admin123']);
    Assert::equals(200, $loginAdmin['status']);
    $adminToken = $loginAdmin['session_token'];

    // Admin creates custom role 'coach' (only can_view_all_users_data = true)
    $coachRole = Router::handle($pdo, 'POST', 'admin/roles', [], [
        'name' => 'coach',
        'description' => 'Pelatih diet pemantau progres',
        'can_manage_users' => false,
        'can_manage_roles' => false,
        'can_view_all_users_data' => true,
        'can_view_audit_logs' => false,
    ], $adminToken);
    Assert::equals(201, $coachRole['status']);
    $coachRoleId = (int) $coachRole['payload']['data']['id'];

    // Cannot delete system role 'admin'
    Assert::equals(400, Router::handle($pdo, 'DELETE', 'admin/roles', ['id' => 1], [], $adminToken)['status']);

    // Admin creates a coach user via admin/users
    $coachUser = Router::handle($pdo, 'POST', 'admin/users', [], [
        'username' => 'coach_rizky',
        'full_name' => 'Coach Rizky',
        'password' => 'coach123',
        'role_id' => $coachRoleId,
        'is_active' => true,
    ], $adminToken);
    Assert::equals(201, $coachUser['status']);

    // Coach logs in -> CAN view user_a overview (200), CANNOT manage roles (403)
    $loginCoach = Router::handle($pdo, 'POST', 'auth/login', [], ['username' => 'coach_rizky', 'password' => 'coach123']);
    $coachToken = $loginCoach['session_token'];
    $userAId = (int) $pdo->query("SELECT id FROM users WHERE username = 'user_a'")->fetchColumn();

    $overview = Router::handle($pdo, 'GET', 'admin/user-overview', ['user_id' => $userAId, 'range' => '7d', 'date' => '2026-11-18'], [], $coachToken);
    Assert::equals(200, $overview['status']);
    Assert::equals(500, (int) $overview['payload']['data']['dashboard']['today_summary']['calories_in']);
    Assert::equals(403, Router::handle($pdo, 'GET', 'admin/roles', [], [], $coachToken)['status']);

    // Admin cannot delete self
    Assert::equals(400, Router::handle($pdo, 'DELETE', 'admin/users', ['id' => 1], [], $adminToken)['status']);

    // Admin views audit logs -> contains register, create_food_log, create_role, create_user
    $logsRes = Router::handle($pdo, 'GET', 'admin/audit-logs', ['limit' => 50], [], $adminToken);
    Assert::equals(200, $logsRes['status']);
    $actions = array_column($logsRes['payload']['data'], 'action');
    Assert::true(in_array('create_role', $actions, true), 'Missing create_role in audit logs');
    Assert::true(in_array('create_user', $actions, true), 'Missing create_user in audit logs');
    Assert::true(in_array('create_food_log', $actions, true), 'Missing create_food_log in audit logs');
});

exit(Assert::summary('RbacIsolationTest'));
