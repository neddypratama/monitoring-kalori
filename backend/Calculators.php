<?php
declare(strict_types=1);

final class Calculators
{
    public const ACTIVITY_MULTIPLIERS = [
        'sedentary' => 1.2,
        'light' => 1.375,
        'moderate' => 1.55,
        'active' => 1.725,
    ];

    public static function parseNumber(mixed $value): ?float
    {
        if ($value === null || is_bool($value) || is_array($value)) {
            return null;
        }
        if (is_int($value) || is_float($value)) {
            return is_finite((float) $value) ? (float) $value : null;
        }
        $str = trim((string) $value);
        if ($str === '') {
            return null;
        }
        $normalized = str_replace(',', '.', $str);
        if (!is_numeric($normalized)) {
            return null;
        }
        $num = (float) $normalized;
        return is_finite($num) ? $num : null;
    }

    /**
     * @return array{bmi: float, category: string}
     */
    public static function calculateBmi(float $weightKg, float $heightCm): array
    {
        if ($weightKg <= 0 || $heightCm <= 0) {
            throw new InvalidArgumentException('Berat badan dan tinggi badan harus lebih dari 0.');
        }
        $heightM = $heightCm / 100.0;
        $bmi = round($weightKg / ($heightM * $heightM), 1);

        if ($bmi < 18.5) {
            $category = 'Berat Badan Kurang';
        } elseif ($bmi <= 25.0) {
            $category = 'Normal';
        } elseif ($bmi <= 27.0) {
            $category = 'Gemuk Ringan';
        } else {
            $category = 'Obesitas';
        }

        return [
            'bmi' => $bmi,
            'category' => $category,
        ];
    }

    public static function calculateBmr(float $weightKg, float $heightCm, int $age, string $gender): float
    {
        if ($weightKg <= 0 || $heightCm <= 0 || $age <= 0) {
            throw new InvalidArgumentException('Berat badan, tinggi badan, dan usia harus lebih dari 0.');
        }
        if ($gender !== 'male' && $gender !== 'female') {
            throw new InvalidArgumentException('Jenis kelamin harus male atau female.');
        }
        $base = (10.0 * $weightKg) + (6.25 * $heightCm) - (5.0 * $age);
        return $gender === 'male' ? $base + 5.0 : $base - 161.0;
    }

    public static function calculateTdee(float $bmr, string $activityLevel): float
    {
        if (!isset(self::ACTIVITY_MULTIPLIERS[$activityLevel])) {
            throw new InvalidArgumentException('Tingkat aktivitas tidak valid.');
        }
        return round($bmr * self::ACTIVITY_MULTIPLIERS[$activityLevel], 2);
    }

    public static function calculateRecommendedCalories(float $tdee, string $goalType, string $gender): int
    {
        if ($gender !== 'male' && $gender !== 'female') {
            throw new InvalidArgumentException('Jenis kelamin harus male atau female.');
        }
        $safeFloor = $gender === 'female' ? 1200 : 1500;

        return match ($goalType) {
            'lose' => max($safeFloor, (int) round($tdee - 500.0)),
            'maintain' => (int) round($tdee),
            'gain' => (int) round($tdee + 300.0),
            default => throw new InvalidArgumentException('Tujuan diet harus lose, maintain, atau gain.'),
        };
    }

    /**
     * @param array<string, mixed> $food
     * @return array{calories: int, protein: float, carbs: float, fat: float}
     */
    public static function calculateFoodNutrition(array $food, float $quantity, string $unit): array
    {
        if ($quantity <= 0) {
            throw new InvalidArgumentException('Jumlah porsi makanan harus lebih dari 0.');
        }
        $unitTrimmed = trim($unit);
        $defaultUnit = trim((string) ($food['default_unit'] ?? 'porsi'));
        $servingGrams = (float) ($food['serving_grams'] ?? 100);
        if ($servingGrams <= 0) {
            throw new InvalidArgumentException('Berat porsi standar makanan tidak valid.');
        }

        if (strtolower($unitTrimmed) === 'gram' || strtolower($unitTrimmed) === 'g') {
            $grams = $quantity;
        } elseif ($unitTrimmed === '' || strcasecmp($unitTrimmed, $defaultUnit) === 0) {
            $grams = $quantity * $servingGrams;
        } else {
            throw new InvalidArgumentException("Satuan makanan tidak didukung: {$unitTrimmed}. Gunakan '{$defaultUnit}' atau 'gram'.");
        }

        $factor = $grams / 100.0;
        return [
            'calories' => (int) round($factor * (float) ($food['calories_per_100g'] ?? 0)),
            'protein' => round($factor * (float) ($food['protein_per_100g'] ?? 0), 1),
            'carbs' => round($factor * (float) ($food['carbs_per_100g'] ?? 0), 1),
            'fat' => round($factor * (float) ($food['fat_per_100g'] ?? 0), 1),
        ];
    }

    /**
     * @param array<string, mixed> $activity
     * @return array{calories_burned: int, duration_minutes: float, distance_meters: ?float}
     */
    public static function calculateActivityCalories(array $activity, float $inputValue, string $inputUnit, float $weightKg): array
    {
        if ($inputValue <= 0) {
            throw new InvalidArgumentException('Nilai durasi atau jarak aktivitas harus lebih dari 0.');
        }
        if ($weightKg <= 0) {
            throw new InvalidArgumentException('Berat badan acuan harus lebih dari 0.');
        }

        $met = (float) ($activity['met'] ?? 0);
        if ($met <= 0) {
            throw new InvalidArgumentException('Nilai MET aktivitas harus lebih dari 0.');
        }

        $unit = strtolower(trim($inputUnit));
        $supportsDistance = (int) ($activity['supports_distance'] ?? 0) === 1;
        $defaultSpeedKmh = isset($activity['default_speed_kmh']) ? (float) $activity['default_speed_kmh'] : 0.0;

        if ($unit === 'menit') {
            $durationMinutes = $inputValue;
            $distanceMeters = null;
        } elseif ($unit === 'm' || $unit === 'km') {
            if (!$supportsDistance || $defaultSpeedKmh <= 0) {
                throw new InvalidArgumentException('Aktivitas ini tidak mendukung satuan jarak. Gunakan satuan menit.');
            }
            $distanceKm = $unit === 'm' ? ($inputValue / 1000.0) : $inputValue;
            $distanceMeters = round($distanceKm * 1000.0, 2);
            $durationMinutes = ($distanceKm / $defaultSpeedKmh) * 60.0;
        } else {
            throw new InvalidArgumentException('Satuan aktivitas harus m, km, atau menit.');
        }

        $calories = (int) round(($met * 3.5 * $weightKg / 200.0) * $durationMinutes);

        return [
            'calories_burned' => $calories,
            'duration_minutes' => round($durationMinutes, 2),
            'distance_meters' => $distanceMeters,
        ];
    }

    /**
     * Calculate balanced daily food intake target + daily exercise burn suggestion
     * for reaching $targetWeightKg within $durationDays.
     *
     * @return ?array<string, mixed>
     */
    public static function calculateDietPlan(
        float $currentWeightKg,
        ?float $targetWeightKg,
        ?int $durationDays,
        float $tdee,
        string $gender,
        string $goalType,
        ?string $startDate = null,
        ?string $asOfDate = null
    ): ?array {
        if ($targetWeightKg === null || $durationDays === null || $durationDays <= 0 || $currentWeightKg <= 0) {
            return null;
        }

        $safeFloor = $gender === 'female' ? 1200 : 1500;
        $todayStr = $asOfDate ?? date('Y-m-d');
        $startStr = ($startDate !== null && $startDate !== '') ? $startDate : $todayStr;

        $startDt = new DateTimeImmutable($startStr);
        $todayDt = new DateTimeImmutable($todayStr);
        $endDt = $startDt->modify('+' . max(1, $durationDays - 1) . ' days');

        $daysElapsed = max(1, (int) $startDt->diff($todayDt)->format('%r%a') + 1);
        if ($daysElapsed > $durationDays) {
            $daysElapsed = $durationDays;
        }
        $daysRemaining = max(0, $durationDays - $daysElapsed);
        // Use remaining days (at least 1) when recalculating ongoing pace, or full duration on day 1
        $effectiveDays = $daysRemaining > 0 ? ($daysRemaining + 1) : 1;
        // On day 1 ($daysElapsed === 1), $effectiveDays equals $durationDays
        if ($daysElapsed === 1) {
            $effectiveDays = $durationDays;
        }

        $weightDiffKg = round($targetWeightKg - $currentWeightKg, 2);
        $absDiff = abs($weightDiffKg);
        $totalCaloriesNeeded = $absDiff * 7700.0;
        $dailyGap = (int) round($totalCaloriesNeeded / $effectiveDays);
        $weeklyRateKg = round(($absDiff / $effectiveDays) * 7.0, 2);

        $isAggressive = false;
        $recommendedMinDays = $durationDays;
        $direction = 'maintain';
        $suggestedFood = (int) round($tdee);
        $suggestedExercise = 200;
        $advice = 'Target berat badan sudah tercapai! Jaga asupan sesuai TDEE dan olahraga ringan rutin.';

        if ($weightDiffKg < -0.05) {
            $direction = 'lose';
            $foodCut = (int) round($dailyGap * 0.65);
            $rawFood = (int) round($tdee - $foodCut);

            if ($rawFood < $safeFloor) {
                $suggestedFood = $safeFloor;
                $actualFoodCut = max(0, (int) round($tdee - $safeFloor));
                $suggestedExercise = max(0, $dailyGap - $actualFoodCut);
            } else {
                $suggestedFood = $rawFood;
                $suggestedExercise = max(0, $dailyGap - $foodCut);
            }

            $isAggressive = ($weeklyRateKg > 1.0) || ($dailyGap > 1000) || ($suggestedExercise > 600);
            $recommendedMinDays = (int) max(7, ceil(($absDiff * 7.0) / 0.75));
            $advice = $isAggressive
                ? "Target turun {$absDiff} kg dalam {$effectiveDays} hari cukup ketat ({$weeklyRateKg} kg/minggu). Pertimbangkan durasi minimal sekitar {$recommendedMinDays} hari agar lebih sehat dan berkelanjutan."
                : "Untuk turun {$absDiff} kg tepat waktu, kombinasikan makan sekitar {$suggestedFood} kkal/hari dan bakar sekitar {$suggestedExercise} kkal/hari lewat olahraga.";
        } elseif ($weightDiffKg > 0.05) {
            $direction = 'gain';
            $suggestedExercise = 150; // Latihan beban ringan untuk membentuk otot
            $suggestedFood = (int) round($tdee + $dailyGap + $suggestedExercise);
            $isAggressive = $weeklyRateKg > 0.5;
            $recommendedMinDays = (int) max(14, ceil(($absDiff * 7.0) / 0.4));
            $advice = $isAggressive
                ? "Target naik {$absDiff} kg dalam {$effectiveDays} hari cukup cepat ({$weeklyRateKg} kg/minggu). Disarankan durasi minimal {$recommendedMinDays} hari agar kenaikan lebih dominan massa otot."
                : "Untuk naik {$absDiff} kg secara sehat, konsumsi sekitar {$suggestedFood} kkal/hari diimbangi latihan kekuatan (~{$suggestedExercise} kkal/hari).";
        } elseif ($goalType === 'lose') {
            $direction = 'maintain';
        }

        // Practical exercise equivalents based on current body weight
        // Brisk walk: MET 4.3, speed 6.0 km/h; Jogging: MET 8.3
        $walkKcalPerMin = (4.3 * 3.5 * $currentWeightKg) / 200.0;
        $jogKcalPerMin = (8.3 * 3.5 * $currentWeightKg) / 200.0;
        $walkMinEquiv = $suggestedExercise > 0 && $walkKcalPerMin > 0 ? (int) round($suggestedExercise / $walkKcalPerMin) : 0;
        $walkKmEquiv = $walkMinEquiv > 0 ? round(($walkMinEquiv / 60.0) * 6.0, 1) : 0.0;
        $jogMinEquiv = $suggestedExercise > 0 && $jogKcalPerMin > 0 ? (int) round($suggestedExercise / $jogKcalPerMin) : 0;

        return [
            'direction' => $direction,
            'duration_days' => $durationDays,
            'start_date' => $startStr,
            'target_end_date' => $endDt->format('Y-m-d'),
            'days_elapsed' => $daysElapsed,
            'days_remaining' => $daysRemaining,
            'effective_days' => $effectiveDays,
            'weight_diff_kg' => $weightDiffKg,
            'total_calories_needed' => (int) round($totalCaloriesNeeded),
            'daily_gap_kcal' => $dailyGap,
            'weekly_rate_kg' => $weeklyRateKg,
            'suggested_food_calories' => $suggestedFood,
            'suggested_exercise_burn' => $suggestedExercise,
            'is_aggressive' => $isAggressive,
            'recommended_min_days' => $recommendedMinDays,
            'walk_min_equiv' => $walkMinEquiv,
            'walk_km_equiv' => $walkKmEquiv,
            'jog_min_equiv' => $jogMinEquiv,
            'advice' => $advice,
        ];
    }
}
