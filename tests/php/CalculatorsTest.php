<?php
declare(strict_types=1);

require_once __DIR__ . '/Assert.php';
require_once __DIR__ . '/../../backend/Calculators.php';

echo "Running CalculatorsTest...\n";

Assert::test('parseNumber handles Indonesian comma decimals, dots, and invalid values', function (): void {
    Assert::equals(68.5, Calculators::parseNumber('68,5'));
    Assert::equals(0.5, Calculators::parseNumber('0.5'));
    Assert::equals(12.25, Calculators::parseNumber(' 12,25 '));
    Assert::equals(70.0, Calculators::parseNumber(70));
    Assert::equals(null, Calculators::parseNumber('abc'));
    Assert::equals(null, Calculators::parseNumber(''));
    Assert::equals(null, Calculators::parseNumber(null));
});

Assert::test('calculateBmi uses Kemenkes RI categories', function (): void {
    Assert::equals(['bmi' => 18.4, 'category' => 'Berat Badan Kurang'], Calculators::calculateBmi(53.2, 170));
    Assert::equals(['bmi' => 24.2, 'category' => 'Normal'], Calculators::calculateBmi(70.0, 170));
    Assert::equals(['bmi' => 25.0, 'category' => 'Normal'], Calculators::calculateBmi(72.25, 170));
    Assert::equals(['bmi' => 26.0, 'category' => 'Gemuk Ringan'], Calculators::calculateBmi(75.1, 170));
    Assert::equals(['bmi' => 27.7, 'category' => 'Obesitas'], Calculators::calculateBmi(80.0, 170));
});

Assert::test('calculateBmr, calculateTdee, and calculateRecommendedCalories follow spec', function (): void {
    // 10*70 + 6.25*170 - 5*25 + 5 = 700 + 1062.5 - 125 + 5 = 1642.5
    Assert::approx(1642.5, Calculators::calculateBmr(70, 170, 25, 'male'), 0.01);
    Assert::approx(1476.5, Calculators::calculateBmr(70, 170, 25, 'female'), 0.01);
    Assert::approx(1971.0, Calculators::calculateTdee(1642.5, 'sedentary'), 0.01);
    Assert::approx(2258.44, Calculators::calculateTdee(1642.5, 'light'), 0.01);
    Assert::approx(2545.88, Calculators::calculateTdee(1642.5, 'moderate'), 0.01);
    Assert::approx(2833.31, Calculators::calculateTdee(1642.5, 'active'), 0.01);

    // Safe calorie floors: 1500 male, 1200 female
    Assert::equals(1500, Calculators::calculateRecommendedCalories(1800, 'lose', 'male'));
    Assert::equals(1200, Calculators::calculateRecommendedCalories(1500, 'lose', 'female'));
    Assert::equals(1971, Calculators::calculateRecommendedCalories(1971.0, 'maintain', 'male'));
    Assert::equals(2271, Calculators::calculateRecommendedCalories(1971.0, 'gain', 'male'));
});

Assert::test('calculateFoodNutrition computes default_unit and gram accurately', function (): void {
    $nasi = [
        'default_unit' => 'piring',
        'serving_grams' => 150,
        'calories_per_100g' => 130,
        'protein_per_100g' => 2.7,
        'carbs_per_100g' => 28.0,
        'fat_per_100g' => 0.3,
    ];
    Assert::equals(
        ['calories' => 195, 'protein' => 4.1, 'carbs' => 42.0, 'fat' => 0.5],
        Calculators::calculateFoodNutrition($nasi, 1.0, 'piring')
    );
    Assert::equals(
        ['calories' => 293, 'protein' => 6.1, 'carbs' => 63.0, 'fat' => 0.7],
        Calculators::calculateFoodNutrition($nasi, 1.5, 'piring')
    );
    Assert::equals(
        ['calories' => 130, 'protein' => 2.7, 'carbs' => 28.0, 'fat' => 0.3],
        Calculators::calculateFoodNutrition($nasi, 100.0, 'gram')
    );
});

Assert::test('calculateActivityCalories computes distance (m, km) and duration (menit)', function (): void {
    $jalan = ['met' => 3.3, 'supports_distance' => 1, 'default_speed_kmh' => 4.5];

    $res500m = Calculators::calculateActivityCalories($jalan, 500, 'm', 70);
    Assert::equals(27, $res500m['calories_burned']);
    Assert::approx(6.67, $res500m['duration_minutes'], 0.05);
    Assert::equals(500.0, $res500m['distance_meters']);

    $res2km = Calculators::calculateActivityCalories($jalan, 2.0, 'km', 70);
    Assert::equals(108, $res2km['calories_burned']);
    Assert::approx(26.67, $res2km['duration_minutes'], 0.05);
    Assert::equals(2000.0, $res2km['distance_meters']);

    $res30min = Calculators::calculateActivityCalories($jalan, 30, 'menit', 70);
    Assert::equals(121, $res30min['calories_burned']);
    Assert::equals(30.0, $res30min['duration_minutes']);
    Assert::equals(null, $res30min['distance_meters']);
});

Assert::test('rejects invalid units and non-positive values', function (): void {
    $yoga = ['met' => 3.0, 'supports_distance' => 0, 'default_speed_kmh' => null];
    $jalan = ['met' => 3.3, 'supports_distance' => 1, 'default_speed_kmh' => 4.5];
    $nasi = [
        'default_unit' => 'piring',
        'serving_grams' => 150,
        'calories_per_100g' => 130,
        'protein_per_100g' => 2.7,
        'carbs_per_100g' => 28.0,
        'fat_per_100g' => 0.3,
    ];

    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateActivityCalories($yoga, 500, 'm', 70));
    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateActivityCalories($jalan, 0, 'm', 70));
    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateActivityCalories($jalan, -10, 'menit', 70));
    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateFoodNutrition($nasi, -1, 'piring'));
    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateFoodNutrition($nasi, 0, 'gram'));
    Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateBmi(0, 170));
});

exit(Assert::summary('CalculatorsTest'));
