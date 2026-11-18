<?php
declare(strict_types=1);

require_once __DIR__ . '/Calculators.php';

final class AnalyticsService
{
    public const KCAL_PER_KG = 7700.0;
    public const MIN_EVALUATION_DAYS = 3;
    public const TOLERANCE_KG = 0.5;

    public static function getEffectiveWeightForDate(PDO $pdo, int $userId, string $date, float $fallbackWeight): float
    {
        $stmt = $pdo->prepare(
            'SELECT weight_kg FROM weight_logs WHERE user_id = ? AND log_date <= ? ORDER BY log_date DESC LIMIT 1'
        );
        $stmt->execute([$userId, $date]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row !== false ? (float) $row['weight_kg'] : $fallbackWeight;
    }

    /**
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    public static function getCurrentMetrics(PDO $pdo, int $userId, array $profile, ?string $asOfDate = null): array
    {
        $date = $asOfDate ?? date('Y-m-d');
        $currentWeight = self::getEffectiveWeightForDate($pdo, $userId, $date, (float) $profile['initial_weight_kg']);
        $heightCm = (float) $profile['height_cm'];
        $age = (int) $profile['age'];
        $gender = (string) $profile['gender'];
        $activityLevel = (string) $profile['activity_level'];
        $goalType = (string) $profile['goal_type'];

        $bmiData = Calculators::calculateBmi($currentWeight, $heightCm);
        $bmr = Calculators::calculateBmr($currentWeight, $heightCm, $age, $gender);
        $tdee = Calculators::calculateTdee($bmr, $activityLevel);
        $recommended = Calculators::calculateRecommendedCalories($tdee, $goalType, $gender);

        $isManual = (int) ($profile['is_manual_target'] ?? 0) === 1;
        $manualTarget = isset($profile['daily_calorie_target']) ? (int) $profile['daily_calorie_target'] : null;
        $activeTarget = ($isManual && $manualTarget !== null && $manualTarget > 0) ? $manualTarget : $recommended;

        return [
            'current_weight_kg' => round($currentWeight, 2),
            'initial_weight_kg' => round((float) $profile['initial_weight_kg'], 2),
            'weight_change_from_start_kg' => round($currentWeight - (float) $profile['initial_weight_kg'], 2),
            'bmi' => $bmiData['bmi'],
            'bmi_category' => $bmiData['category'],
            'bmr' => round($bmr, 1),
            'tdee' => round($tdee, 1),
            'recommended_calorie_target' => $recommended,
            'active_calorie_target' => $activeTarget,
            'is_manual_target' => $isManual,
        ];
    }

    /**
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    public static function getDailySummary(PDO $pdo, int $userId, array $profile, string $date): array
    {
        $foodStmt = $pdo->prepare(
            'SELECT COUNT(*) AS cnt,
                    COALESCE(SUM(calories), 0) AS calories,
                    COALESCE(SUM(protein), 0) AS protein,
                    COALESCE(SUM(carbs), 0) AS carbs,
                    COALESCE(SUM(fat), 0) AS fat
             FROM food_logs WHERE user_id = ? AND log_date = ?'
        );
        $foodStmt->execute([$userId, $date]);
        $food = $foodStmt->fetch(PDO::FETCH_ASSOC);

        $actStmt = $pdo->prepare(
            'SELECT COUNT(*) AS cnt, COALESCE(SUM(calories_burned), 0) AS burned
             FROM activity_logs WHERE user_id = ? AND log_date = ?'
        );
        $actStmt->execute([$userId, $date]);
        $act = $actStmt->fetch(PDO::FETCH_ASSOC);

        $wStmt = $pdo->prepare('SELECT weight_kg FROM weight_logs WHERE user_id = ? AND log_date = ? LIMIT 1');
        $wStmt->execute([$userId, $date]);
        $wRow = $wStmt->fetch(PDO::FETCH_ASSOC);
        $weightOnDate = $wRow !== false ? (float) $wRow['weight_kg'] : null;

        $effectiveWeight = self::getEffectiveWeightForDate($pdo, $userId, $date, (float) $profile['initial_weight_kg']);
        $bmr = Calculators::calculateBmr($effectiveWeight, (float) $profile['height_cm'], (int) $profile['age'], (string) $profile['gender']);
        $baselineTdee = Calculators::calculateTdee($bmr, (string) $profile['activity_level']);
        $recommendedTarget = Calculators::calculateRecommendedCalories($baselineTdee, (string) $profile['goal_type'], (string) $profile['gender']);
        $isManual = (int) ($profile['is_manual_target'] ?? 0) === 1;
        $dailyTarget = ($isManual && !empty($profile['daily_calorie_target']))
            ? (int) $profile['daily_calorie_target']
            : $recommendedTarget;

        $caloriesIn = (int) $food['calories'];
        $caloriesBurned = (int) $act['burned'];
        $totalExpenditure = round($baselineTdee + $caloriesBurned, 1);
        $calorieBalance = round($caloriesIn - $totalExpenditure, 1);
        $remainingQuota = ($dailyTarget + $caloriesBurned) - $caloriesIn;

        return [
            'date' => $date,
            'calories_in' => $caloriesIn,
            'calories_burned' => $caloriesBurned,
            'baseline_tdee' => round($baselineTdee, 1),
            'total_expenditure' => $totalExpenditure,
            'calorie_balance' => $calorieBalance,
            'daily_target' => $dailyTarget,
            'remaining_quota' => $remainingQuota,
            'protein' => round((float) $food['protein'], 1),
            'carbs' => round((float) $food['carbs'], 1),
            'fat' => round((float) $food['fat'], 1),
            'weight_on_date' => $weightOnDate !== null ? round($weightOnDate, 2) : null,
            'effective_weight' => round($effectiveWeight, 2),
            'food_count' => (int) $food['cnt'],
            'activity_count' => (int) $act['cnt'],
        ];
    }

    /**
     * @param array<string, mixed> $profile
     * @return array<string, mixed>
     */
    public static function getDashboardData(PDO $pdo, int $userId, array $profile, string $range = '7d', ?string $today = null): array
    {
        $endDate = $today ?? date('Y-m-d');
        $startDate = self::resolveStartDate($pdo, $userId, $range, $endDate);
        $dates = self::enumerateDates($startDate, $endDate);

        $wStmt = $pdo->prepare('SELECT log_date, weight_kg FROM weight_logs WHERE user_id = ? ORDER BY log_date ASC');
        $wStmt->execute([$userId]);
        $allWeights = $wStmt->fetchAll(PDO::FETCH_ASSOC);
        $weightByDate = [];
        foreach ($allWeights as $w) {
            $weightByDate[$w['log_date']] = (float) $w['weight_kg'];
        }

        $foodStmt = $pdo->prepare(
            'SELECT log_date, COUNT(*) AS cnt, COALESCE(SUM(calories), 0) AS calories
             FROM food_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? GROUP BY log_date'
        );
        $foodStmt->execute([$userId, $startDate, $endDate]);
        $foodByDate = [];
        foreach ($foodStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $foodByDate[$r['log_date']] = ['cnt' => (int) $r['cnt'], 'calories' => (int) $r['calories']];
        }

        $actStmt = $pdo->prepare(
            'SELECT log_date, COALESCE(SUM(calories_burned), 0) AS burned
             FROM activity_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? GROUP BY log_date'
        );
        $actStmt->execute([$userId, $startDate, $endDate]);
        $actByDate = [];
        foreach ($actStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $actByDate[$r['log_date']] = (int) $r['burned'];
        }

        $windowWeights = [];
        foreach ($dates as $d) {
            if (isset($weightByDate[$d])) {
                $windowWeights[$d] = $weightByDate[$d];
            }
        }
        $windowWeightDates = array_keys($windowWeights);
        $startWeightDate = count($windowWeightDates) > 0 ? $windowWeightDates[0] : null;
        $endWeightDate = count($windowWeightDates) > 0 ? $windowWeightDates[count($windowWeightDates) - 1] : null;
        $startWeightKg = $startWeightDate !== null ? $windowWeights[$startWeightDate] : null;
        $endWeightKg = $endWeightDate !== null ? $windowWeights[$endWeightDate] : null;

        $initialWeight = (float) $profile['initial_weight_kg'];
        $heightCm = (float) $profile['height_cm'];
        $age = (int) $profile['age'];
        $gender = (string) $profile['gender'];
        $activityLevel = (string) $profile['activity_level'];
        $goalType = (string) $profile['goal_type'];
        $isManual = (int) ($profile['is_manual_target'] ?? 0) === 1;
        $manualTarget = !empty($profile['daily_calorie_target']) ? (int) $profile['daily_calorie_target'] : null;
        $targetWeight = isset($profile['target_weight_kg']) && $profile['target_weight_kg'] !== null
            ? (float) $profile['target_weight_kg']
            : null;

        $wIdx = 0;
        $wCount = count($allWeights);
        $carryWeight = $initialWeight;

        $calorieSeries = [];
        $weightSeries = [];
        $cumulativeBalanceInSpan = 0.0;
        $calorieDaysInSpan = 0;
        $runningProjectedWeight = $startWeightKg;

        foreach ($dates as $d) {
            while ($wIdx < $wCount && $allWeights[$wIdx]['log_date'] <= $d) {
                $carryWeight = (float) $allWeights[$wIdx]['weight_kg'];
                $wIdx++;
            }

            $bmr = Calculators::calculateBmr($carryWeight, $heightCm, $age, $gender);
            $tdee = Calculators::calculateTdee($bmr, $activityLevel);
            $recTarget = Calculators::calculateRecommendedCalories($tdee, $goalType, $gender);
            $dayTarget = ($isManual && $manualTarget !== null) ? $manualTarget : $recTarget;

            $hasFood = isset($foodByDate[$d]) && $foodByDate[$d]['cnt'] > 0;
            $calIn = $hasFood ? $foodByDate[$d]['calories'] : 0;
            $calBurn = $actByDate[$d] ?? 0;
            $dayBalance = $hasFood ? round($calIn - ($tdee + $calBurn), 1) : null;

            $calorieSeries[] = [
                'date' => $d,
                'calories_in' => $calIn,
                'calories_burned' => $calBurn,
                'target' => $dayTarget,
                'baseline_tdee' => round($tdee, 1),
                'balance' => $dayBalance,
            ];

            if ($startWeightDate !== null && $endWeightDate !== null && $d >= $startWeightDate && $d <= $endWeightDate) {
                if ($hasFood && $dayBalance !== null) {
                    $cumulativeBalanceInSpan += $dayBalance;
                    $calorieDaysInSpan++;
                }
            }

            $projectedPoint = null;
            if ($startWeightDate !== null && $runningProjectedWeight !== null && $d >= $startWeightDate) {
                if ($hasFood && $dayBalance !== null) {
                    $runningProjectedWeight += ($dayBalance / self::KCAL_PER_KG);
                }
                $projectedPoint = round($runningProjectedWeight, 2);
            }

            $movingAvg = self::computeTrailingMovingAvg($allWeights, $d, 7);

            $weightSeries[] = [
                'date' => $d,
                'actual_weight' => isset($weightByDate[$d]) ? round($weightByDate[$d], 2) : null,
                'moving_avg_7d' => $movingAvg,
                'projected_weight' => $projectedPoint,
                'target_weight' => $targetWeight,
            ];
        }

        $evaluation = self::buildEvaluation(
            count($windowWeightDates),
            $calorieDaysInSpan,
            $startWeightDate,
            $endWeightDate,
            $startWeightKg,
            $endWeightKg,
            $cumulativeBalanceInSpan
        );

        return [
            'range' => $range,
            'today_summary' => self::getDailySummary($pdo, $userId, $profile, $endDate),
            'metrics' => self::getCurrentMetrics($pdo, $userId, $profile, $endDate),
            'evaluation' => $evaluation,
            'calorie_series' => $calorieSeries,
            'weight_series' => $weightSeries,
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $allWeights
     */
    private static function computeTrailingMovingAvg(array $allWeights, string $date, int $windowDays): ?float
    {
        $cutoff = (new DateTimeImmutable($date))->modify('-' . ($windowDays - 1) . ' days')->format('Y-m-d');
        $sum = 0.0;
        $cnt = 0;
        foreach ($allWeights as $w) {
            if ($w['log_date'] > $date) {
                break;
            }
            if ($w['log_date'] >= $cutoff) {
                $sum += (float) $w['weight_kg'];
                $cnt++;
            }
        }
        return $cnt > 0 ? round($sum / $cnt, 2) : null;
    }

    /**
     * @return array<string, mixed>
     */
    private static function buildEvaluation(
        int $weightDays,
        int $calorieDays,
        ?string $startDate,
        ?string $endDate,
        ?float $startWeightKg,
        ?float $endWeightKg,
        float $cumulativeBalanceKcal
    ): array {
        $theoreticalDelta = round($cumulativeBalanceKcal / self::KCAL_PER_KG, 2);
        $actualDelta = ($startWeightKg !== null && $endWeightKg !== null)
            ? round($endWeightKg - $startWeightKg, 2)
            : null;
        $diff = ($actualDelta !== null) ? round($actualDelta - $theoreticalDelta, 2) : null;

        if ($weightDays < self::MIN_EVALUATION_DAYS || $calorieDays < self::MIN_EVALUATION_DAYS || $actualDelta === null || $diff === null) {
            $needW = max(0, self::MIN_EVALUATION_DAYS - $weightDays);
            $needC = max(0, self::MIN_EVALUATION_DAYS - $calorieDays);
            $parts = [];
            if ($needW > 0) {
                $parts[] = "{$needW} hari catatan berat badan";
            }
            if ($needC > 0) {
                $parts[] = "{$needC} hari catatan makanan dalam rentang penimbangan";
            }
            $explanation = 'Butuh minimal 3 hari data berat badan dan 3 hari catatan makanan dalam rentang penimbangan untuk evaluasi akurat. Kurang: ' . implode(' dan ', $parts) . '.';

            return [
                'status' => 'collecting',
                'label' => 'Mengumpulkan Data',
                'explanation' => $explanation,
                'actual_delta_kg' => $actualDelta,
                'theoretical_delta_kg' => $theoreticalDelta,
                'difference_kg' => $diff,
                'cumulative_balance_kcal' => round($cumulativeBalanceKcal, 0),
                'weight_days' => $weightDays,
                'calorie_days' => $calorieDays,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'start_weight_kg' => $startWeightKg,
                'end_weight_kg' => $endWeightKg,
            ];
        }

        if (abs($diff) <= self::TOLERANCE_KG) {
            $status = 'on_track';
            $label = 'Sesuai Jalur';
            $explanation = 'Perkembangan berat badan aktual Anda selaras dengan catatan kalori masuk dan keluar (selisih dalam batas wajar ±0,5 kg). Pertahankan konsistensi pencatatan Anda!';
        } elseif ($diff < -self::TOLERANCE_KG) {
            $status = 'faster';
            $label = 'Turun Lebih Cepat dari Estimasi';
            $explanation = 'Berat badan turun lebih cepat dibanding estimasi kalori. Ini bisa terjadi karena aktivitas harian non-olahraga lebih tinggi dari perkiraan atau fluktuasi cairan tubuh yang normal.';
        } else {
            $status = 'slower';
            $label = 'Lebih Lambat dari Estimasi';
            $explanation = 'Perubahan berat badan lebih lambat dari estimasi keseimbangan kalori. Coba cek kembali akurasi porsi makanan, camilan/minuman manis yang mungkin belum tercatat, atau retensi air sementara.';
        }

        return [
            'status' => $status,
            'label' => $label,
            'explanation' => $explanation,
            'actual_delta_kg' => $actualDelta,
            'theoretical_delta_kg' => $theoreticalDelta,
            'difference_kg' => $diff,
            'cumulative_balance_kcal' => round($cumulativeBalanceKcal, 0),
            'weight_days' => $weightDays,
            'calorie_days' => $calorieDays,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_weight_kg' => $startWeightKg,
            'end_weight_kg' => $endWeightKg,
        ];
    }

    private static function resolveStartDate(PDO $pdo, int $userId, string $range, string $endDate): string
    {
        $end = new DateTimeImmutable($endDate);
        if ($range === '7d') {
            return $end->modify('-6 days')->format('Y-m-d');
        }
        if ($range === '14d') {
            return $end->modify('-13 days')->format('Y-m-d');
        }
        if ($range === '30d') {
            return $end->modify('-29 days')->format('Y-m-d');
        }

        $earliest = $endDate;
        foreach (['weight_logs', 'food_logs', 'activity_logs'] as $table) {
            $stmt = $pdo->prepare("SELECT MIN(log_date) FROM {$table} WHERE user_id = ?");
            $stmt->execute([$userId]);
            $minDate = $stmt->fetchColumn();
            if (is_string($minDate) && $minDate !== '' && $minDate < $earliest) {
                $earliest = $minDate;
            }
        }
        $sevenAgo = $end->modify('-6 days')->format('Y-m-d');
        return $earliest < $sevenAgo ? $earliest : $sevenAgo;
    }

    /**
     * @return array<int, string>
     */
    private static function enumerateDates(string $startDate, string $endDate): array
    {
        $dates = [];
        $cur = new DateTimeImmutable($startDate);
        $end = new DateTimeImmutable($endDate);
        while ($cur <= $end) {
            $dates[] = $cur->format('Y-m-d');
            $cur = $cur->modify('+1 day');
        }
        return $dates;
    }
}
