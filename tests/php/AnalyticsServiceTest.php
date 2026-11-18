<<<<<<< HEAD
<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/Calculators.php';
require_once __DIR__ . '/../../backend/AnalyticsService.php';

echo "Running AnalyticsServiceTest...\n";

function createTestProfile(PDO $pdo, array $overrides = []): array
{
    $p = array_merge([
        'user_id' => 1,
        'name' => 'Budi',
        'gender' => 'male',
        'age' => 30,
        'height_cm' => 170.0,
        'initial_weight_kg' => 80.0,
        'target_weight_kg' => 70.0,
        'activity_level' => 'sedentary',
        'goal_type' => 'lose',
        'daily_calorie_target' => null,
        'is_manual_target' => 0,
    ], $overrides);

    $pdo->exec('DELETE FROM user_profile');
    $stmt = $pdo->prepare(
        'INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, daily_calorie_target, is_manual_target)
         VALUES (:user_id, :name, :gender, :age, :height_cm, :initial_weight_kg, :target_weight_kg, :activity_level, :goal_type, :daily_calorie_target, :is_manual_target)'
    );
    $stmt->execute($p);
    return $pdo->query('SELECT * FROM user_profile WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);
}

Assert::test('dynamic carry-forward weight & backdated weight updates historical TDEE', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-10', 75.0)");
    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-05', 78.0)");

    Assert::equals(80.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-04', 80.0));
    Assert::equals(78.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-06', 80.0));
    Assert::equals(75.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-12', 80.0));

    $sum06 = AnalyticsService::getDailySummary($pdo, 1, $profile, '2026-11-06');
    $sum12 = AnalyticsService::getDailySummary($pdo, 1, $profile, '2026-11-12');
    $expectedTdee78 = Calculators::calculateTdee(Calculators::calculateBmr(78.0, 170.0, 30, 'male'), 'sedentary');
    $expectedTdee75 = Calculators::calculateTdee(Calculators::calculateBmr(75.0, 170.0, 30, 'male'), 'sedentary');

    Assert::approx($expectedTdee78, (float) $sum06['baseline_tdee'], 0.01);
    Assert::approx($expectedTdee75, (float) $sum12['baseline_tdee'], 0.01);
});

Assert::test('returns collecting status when fewer than 3 weight days or 3 calorie days', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-16', 80.0), (1, '2026-11-18', 79.6)");
    $pdo->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-16', 'siang', 'Nasi', 1, 'piring', 1500), (1, '2026-11-17', 'siang', 'Nasi', 1, 'piring', 1500), (1, '2026-11-18', 'siang', 'Nasi', 1, 'piring', 1500)");

    $dash = AnalyticsService::getDashboardData($pdo, 1, $profile, '7d', '2026-11-18');
    Assert::equals('collecting', $dash['evaluation']['status']);
    Assert::equals('Mengumpulkan Data', $dash['evaluation']['label']);
    Assert::equals(2, $dash['evaluation']['weight_days']);
});

Assert::test('scopes calorie accumulation strictly to [start_weight_date, end_weight_date] and skips unlogged days', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-09', 80.0), (1, '2026-11-12', 79.8), (1, '2026-11-15', 79.6)");
    $foodDates = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
    $stmt = $pdo->prepare("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, ?, 'siang', 'Menu Harian', 1, 'porsi', 1500)");
    foreach ($foodDates as $d) {
        $stmt->execute([$d]);
    }

    $dash = AnalyticsService::getDashboardData($pdo, 1, $profile, '14d', '2026-11-18');
    $eval = $dash['evaluation'];

    Assert::equals('2026-11-09', $eval['start_date']);
    Assert::equals('2026-11-15', $eval['end_date']);
    Assert::equals(3, $eval['weight_days']);
    Assert::equals(5, $eval['calorie_days']);
    Assert::equals('on_track', $eval['status']);
    Assert::equals('Sesuai Jalur', $eval['label']);

    $byDate = [];
    foreach ($dash['weight_series'] as $pt) {
        $byDate[$pt['date']] = $pt;
    }
    $day1Tdee = Calculators::calculateTdee(Calculators::calculateBmr(80.0, 170.0, 30, 'male'), 'sedentary');
    $expectedDay1Proj = round(80.0 + ((1500.0 - $day1Tdee) / 7700.0), 2);
    Assert::equals(null, $byDate['2026-11-08']['projected_weight']);
    Assert::approx($expectedDay1Proj, (float) $byDate['2026-11-09']['projected_weight'], 0.01);
    Assert::approx(
        round(80.0 + (float) $eval['theoretical_delta_kg'], 2),
        (float) $byDate['2026-11-15']['projected_weight'],
        0.01
    );
});

Assert::test('evaluates faster and slower verdicts accurately and computes 7d moving average', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);
    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-15', 80.0), (1, '2026-11-16', 79.0), (1, '2026-11-17', 78.6), (1, '2026-11-18', 78.2)");
    $pdo->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-15', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-16', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-17', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-18', 'siang', 'Makan', 1, 'porsi', 1600)");

    $dashFast = AnalyticsService::getDashboardData($pdo, 1, $profile, '7d', '2026-11-18');
    Assert::equals('faster', $dashFast['evaluation']['status']);
    Assert::equals('Turun Lebih Cepat dari Estimasi', $dashFast['evaluation']['label']);

    $lastPoint = end($dashFast['weight_series']);
    Assert::approx(78.95, (float) $lastPoint['moving_avg_7d'], 0.01);

    $pdo2 = Database::connect(':memory:');
    $profile2 = createTestProfile($pdo2);
    $pdo2->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-15', 80.0), (1, '2026-11-16', 80.2), (1, '2026-11-17', 80.5), (1, '2026-11-18', 80.7)");
    $pdo2->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-15', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-16', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-17', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-18', 'siang', 'Makan', 1, 'porsi', 1500)");

    $dashSlow = AnalyticsService::getDashboardData($pdo2, 1, $profile2, '7d', '2026-11-18');
    Assert::equals('slower', $dashSlow['evaluation']['status']);
    Assert::equals('Lebih Lambat dari Estimasi', $dashSlow['evaluation']['label']);
});

exit(Assert::summary('AnalyticsServiceTest'));
=======
<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/Calculators.php';
require_once __DIR__ . '/../../backend/AnalyticsService.php';

echo "Running AnalyticsServiceTest...\n";

function createTestProfile(PDO $pdo, array $overrides = []): array
{
    $p = array_merge([
        'user_id' => 1,
        'name' => 'Budi',
        'gender' => 'male',
        'age' => 30,
        'height_cm' => 170.0,
        'initial_weight_kg' => 80.0,
        'target_weight_kg' => 70.0,
        'activity_level' => 'sedentary',
        'goal_type' => 'lose',
        'daily_calorie_target' => null,
        'is_manual_target' => 0,
    ], $overrides);

    $pdo->exec('DELETE FROM user_profile');
    $stmt = $pdo->prepare(
        'INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, daily_calorie_target, is_manual_target)
         VALUES (:user_id, :name, :gender, :age, :height_cm, :initial_weight_kg, :target_weight_kg, :activity_level, :goal_type, :daily_calorie_target, :is_manual_target)'
    );
    $stmt->execute($p);
    return $pdo->query('SELECT * FROM user_profile WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);
}

Assert::test('dynamic carry-forward weight & backdated weight updates historical TDEE', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-10', 75.0)");
    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-05', 78.0)");

    Assert::equals(80.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-04', 80.0));
    Assert::equals(78.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-06', 80.0));
    Assert::equals(75.0, AnalyticsService::getEffectiveWeightForDate($pdo, 1, '2026-11-12', 80.0));

    $sum06 = AnalyticsService::getDailySummary($pdo, 1, $profile, '2026-11-06');
    $sum12 = AnalyticsService::getDailySummary($pdo, 1, $profile, '2026-11-12');
    $expectedTdee78 = Calculators::calculateTdee(Calculators::calculateBmr(78.0, 170.0, 30, 'male'), 'sedentary');
    $expectedTdee75 = Calculators::calculateTdee(Calculators::calculateBmr(75.0, 170.0, 30, 'male'), 'sedentary');

    Assert::approx($expectedTdee78, (float) $sum06['baseline_tdee'], 0.01);
    Assert::approx($expectedTdee75, (float) $sum12['baseline_tdee'], 0.01);
});

Assert::test('returns collecting status when fewer than 3 weight days or 3 calorie days', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-16', 80.0), (1, '2026-11-18', 79.6)");
    $pdo->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-16', 'siang', 'Nasi', 1, 'piring', 1500), (1, '2026-11-17', 'siang', 'Nasi', 1, 'piring', 1500), (1, '2026-11-18', 'siang', 'Nasi', 1, 'piring', 1500)");

    $dash = AnalyticsService::getDashboardData($pdo, 1, $profile, '7d', '2026-11-18');
    Assert::equals('collecting', $dash['evaluation']['status']);
    Assert::equals('Mengumpulkan Data', $dash['evaluation']['label']);
    Assert::equals(2, $dash['evaluation']['weight_days']);
});

Assert::test('scopes calorie accumulation strictly to [start_weight_date, end_weight_date] and skips unlogged days', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);

    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-09', 80.0), (1, '2026-11-12', 79.8), (1, '2026-11-15', 79.6)");
    $foodDates = ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-12', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'];
    $stmt = $pdo->prepare("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, ?, 'siang', 'Menu Harian', 1, 'porsi', 1500)");
    foreach ($foodDates as $d) {
        $stmt->execute([$d]);
    }

    $dash = AnalyticsService::getDashboardData($pdo, 1, $profile, '14d', '2026-11-18');
    $eval = $dash['evaluation'];

    Assert::equals('2026-11-09', $eval['start_date']);
    Assert::equals('2026-11-15', $eval['end_date']);
    Assert::equals(3, $eval['weight_days']);
    Assert::equals(5, $eval['calorie_days']);
    Assert::equals('on_track', $eval['status']);
    Assert::equals('Sesuai Jalur', $eval['label']);

    $byDate = [];
    foreach ($dash['weight_series'] as $pt) {
        $byDate[$pt['date']] = $pt;
    }
    $day1Tdee = Calculators::calculateTdee(Calculators::calculateBmr(80.0, 170.0, 30, 'male'), 'sedentary');
    $expectedDay1Proj = round(80.0 + ((1500.0 - $day1Tdee) / 7700.0), 2);
    Assert::equals(null, $byDate['2026-11-08']['projected_weight']);
    Assert::approx($expectedDay1Proj, (float) $byDate['2026-11-09']['projected_weight'], 0.01);
    Assert::approx(
        round(80.0 + (float) $eval['theoretical_delta_kg'], 2),
        (float) $byDate['2026-11-15']['projected_weight'],
        0.01
    );
});

Assert::test('evaluates faster and slower verdicts accurately and computes 7d moving average', function (): void {
    $pdo = Database::connect(':memory:');
    $profile = createTestProfile($pdo);
    $pdo->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-15', 80.0), (1, '2026-11-16', 79.0), (1, '2026-11-17', 78.6), (1, '2026-11-18', 78.2)");
    $pdo->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-15', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-16', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-17', 'siang', 'Makan', 1, 'porsi', 1600), (1, '2026-11-18', 'siang', 'Makan', 1, 'porsi', 1600)");

    $dashFast = AnalyticsService::getDashboardData($pdo, 1, $profile, '7d', '2026-11-18');
    Assert::equals('faster', $dashFast['evaluation']['status']);
    Assert::equals('Turun Lebih Cepat dari Estimasi', $dashFast['evaluation']['label']);

    $lastPoint = end($dashFast['weight_series']);
    Assert::approx(78.95, (float) $lastPoint['moving_avg_7d'], 0.01);

    $pdo2 = Database::connect(':memory:');
    $profile2 = createTestProfile($pdo2);
    $pdo2->exec("INSERT INTO weight_logs (user_id, log_date, weight_kg) VALUES (1, '2026-11-15', 80.0), (1, '2026-11-16', 80.2), (1, '2026-11-17', 80.5), (1, '2026-11-18', 80.7)");
    $pdo2->exec("INSERT INTO food_logs (user_id, log_date, meal_type, food_name, quantity, unit, calories) VALUES (1, '2026-11-15', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-16', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-17', 'siang', 'Makan', 1, 'porsi', 1500), (1, '2026-11-18', 'siang', 'Makan', 1, 'porsi', 1500)");

    $dashSlow = AnalyticsService::getDashboardData($pdo2, 1, $profile2, '7d', '2026-11-18');
    Assert::equals('slower', $dashSlow['evaluation']['status']);
    Assert::equals('Lebih Lambat dari Estimasi', $dashSlow['evaluation']['label']);
});

exit(Assert::summary('AnalyticsServiceTest'));
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
