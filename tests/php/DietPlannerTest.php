<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Calculators.php';
require_once __DIR__ . '/../../backend/Database.php';
require_once __DIR__ . '/../../backend/AnalyticsService.php';

echo "Running DietPlannerTest...\n";

Assert::test('calculates balanced food + exercise plan for 3-month (90 days) weight loss target', function (): void {
    // 75 kg -> 66 kg (-9 kg) in 90 days; TDEE = 2050; male
    $plan = Calculators::calculateDietPlan(75.0, 66.0, 90, 2050.0, 'male', 'lose', '2026-11-18', '2026-11-18');
    Assert::true(is_array($plan), 'Plan should not be null');
    Assert::equals('lose', $plan['direction']);
    Assert::equals(90, $plan['duration_days']);
    Assert::approx(-9.0, (float) $plan['weight_diff_kg'], 0.01);
    Assert::equals(770, (int) $plan['daily_gap_kcal']);
    Assert::approx(0.7, (float) $plan['weekly_rate_kg'], 0.05);
    Assert::equals(false, $plan['is_aggressive']);

    // 65% food cut (501) -> 2050 - 501 = 1549; 35% exercise burn -> 269
    Assert::equals(1549, (int) $plan['suggested_food_calories']);
    Assert::equals(269, (int) $plan['suggested_exercise_burn']);
    Assert::true($plan['walk_min_equiv'] > 20 && $plan['walk_km_equiv'] > 1.0);
    Assert::true($plan['jog_min_equiv'] > 10);
});

Assert::test('enforces safe calorie floor and flags aggressive timelines', function (): void {
    // Female 60 -> 50 (-10 kg) in 30 days; TDEE = 1600 -> way too aggressive!
    $plan = Calculators::calculateDietPlan(60.0, 50.0, 30, 1600.0, 'female', 'lose', '2026-11-18', '2026-11-18');
    Assert::true(is_array($plan));
    Assert::equals(1200, (int) $plan['suggested_food_calories']); // safe floor 1200 for female
    Assert::equals(true, $plan['is_aggressive']);
    Assert::true((int) $plan['recommended_min_days'] >= 90);
});

Assert::test('calculates weight gain plan with strength training burn buffer', function (): void {
    // Male 55 -> 60 (+5 kg) in 90 days; TDEE = 1900
    $plan = Calculators::calculateDietPlan(55.0, 60.0, 90, 1900.0, 'male', 'gain', '2026-11-18', '2026-11-18');
    Assert::true(is_array($plan));
    Assert::equals('gain', $plan['direction']);
    Assert::equals(150, (int) $plan['suggested_exercise_burn']);
    Assert::equals(2478, (int) $plan['suggested_food_calories']); // 1900 + round(5*7700/90)=428 + 150 = 2478
});

Assert::test('Database migrates program_duration_days, program_start_date, and app_settings; AnalyticsService exposes diet_plan', function (): void {
    $pdo = Database::connect(':memory:');
    $stmt = $pdo->prepare(
        "INSERT INTO user_profile (user_id, name, gender, age, height_cm, initial_weight_kg, target_weight_kg, activity_level, goal_type, is_manual_target, program_duration_days, program_start_date)
         VALUES (1, 'Budi', 'male', 28, 170, 75.0, 66.0, 'sedentary', 'lose', 0, 90, '2026-11-01')"
    );
    $stmt->execute();
    $profile = $pdo->query('SELECT * FROM user_profile WHERE user_id = 1')->fetch(PDO::FETCH_ASSOC);

    $metrics = AnalyticsService::getCurrentMetrics($pdo, 1, $profile, '2026-11-18');
    Assert::true(isset($metrics['diet_plan']) && is_array($metrics['diet_plan']), 'Missing diet_plan in metrics');
    Assert::equals(90, (int) $metrics['diet_plan']['duration_days']);
    Assert::equals(18, (int) $metrics['diet_plan']['days_elapsed']); // Nov 1 to Nov 18 inclusive = day 18
    Assert::equals(72, (int) $metrics['diet_plan']['days_remaining']);
    Assert::equals((int) $metrics['diet_plan']['suggested_food_calories'], (int) $metrics['active_calorie_target']);
    Assert::true((int) $metrics['diet_plan']['suggested_exercise_burn'] > 0);

    // app_settings table exists and is writable
    $pdo->exec("INSERT INTO app_settings (setting_key, setting_value) VALUES ('gemini_model', 'gemini-2.5-flash')");
    $val = $pdo->query("SELECT setting_value FROM app_settings WHERE setting_key = 'gemini_model'")->fetchColumn();
    Assert::equals('gemini-2.5-flash', $val);
});

exit(Assert::summary('DietPlannerTest'));
