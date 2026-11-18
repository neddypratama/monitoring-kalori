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
}
