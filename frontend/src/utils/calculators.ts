import type { ActivityItem, ActivityLevel, ActivityUnit, DietPlan, FoodItem, Gender, GoalType } from '../types';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, { title: string; desc: string }> = {
  sedentary: {
    title: 'Sedentari (Disarankan)',
    desc: 'Banyak duduk/kerja kantor; cocok jika Anda mencatat aktivitas jalan & olahraga terpisah.',
  },
  light: {
    title: 'Aktivitas Ringan',
    desc: 'Cukup banyak berdiri/berjalan ringan sepanjang hari.',
  },
  moderate: {
    title: 'Aktivitas Sedang',
    desc: 'Pekerjaan aktif bergerak sepanjang hari.',
  },
  active: {
    title: 'Sangat Aktif',
    desc: 'Aktivitas fisik berat rutin setiap hari.',
  },
};

export const GOAL_LABELS: Record<GoalType, { title: string; desc: string }> = {
  lose: { title: 'Turun Berat Badan', desc: 'Defisit sehat ~500 kkal/hari' },
  maintain: { title: 'Jaga Berat Badan', desc: 'Sesuai kebutuhan kalori harian' },
  gain: { title: 'Naik Berat Badan', desc: 'Surplus ringan ~300 kkal/hari' },
};

export const MEAL_LABELS = {
  sarapan: 'Sarapan',
  siang: 'Makan Siang',
  malam: 'Makan Malam',
  camilan: 'Camilan',
} as const;

export function parseDecimalInput(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d*(\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function previewProfileMetrics(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  goalType: GoalType;
}): {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  recommendedCalories: number;
} | null {
  const { weightKg, heightCm, age, gender, activityLevel, goalType } = input;
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return null;

  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let bmiCategory = 'Obesitas';
  if (bmi < 18.5) bmiCategory = 'Berat Badan Kurang';
  else if (bmi <= 25.0) bmiCategory = 'Normal';
  else if (bmi <= 27.0) bmiCategory = 'Gemuk Ringan';

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round((gender === 'male' ? base + 5 : base - 161) * 10) / 10;
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel] * 10) / 10;

  const floor = gender === 'female' ? 1200 : 1500;
  let recommendedCalories = Math.round(tdee);
  if (goalType === 'lose') recommendedCalories = Math.max(floor, Math.round(tdee - 500));
  else if (goalType === 'gain') recommendedCalories = Math.round(tdee + 300);

  return { bmi, bmiCategory, bmr, tdee, recommendedCalories };
}

export function previewDietPlan(input: {
  currentWeightKg: number;
  targetWeightKg: number | null;
  durationDays: number | null;
  tdee: number;
  gender: Gender;
  goalType: GoalType;
  startDate?: string;
}): DietPlan | null {
  const { currentWeightKg, targetWeightKg, durationDays, tdee, gender, goalType } = input;
  if (!targetWeightKg || !durationDays || durationDays <= 0 || currentWeightKg <= 0) return null;

  const safeFloor = gender === 'female' ? 1200 : 1500;
  const startStr = input.startDate || getLocalDateIso();
  const targetEndDate = shiftDateIso(startStr, Math.max(0, durationDays - 1));

  const weightDiffKg = Math.round((targetWeightKg - currentWeightKg) * 100) / 100;
  const absDiff = Math.abs(weightDiffKg);
  const totalCaloriesNeeded = Math.round(absDiff * 7700);
  const dailyGap = Math.round(totalCaloriesNeeded / durationDays);
  const weeklyRateKg = Math.round(((absDiff / durationDays) * 7) * 100) / 100;

  let direction: 'lose' | 'maintain' | 'gain' = 'maintain';
  let suggestedFood = Math.round(tdee);
  let suggestedExercise = 200;
  let isAggressive = false;
  let recommendedMinDays = durationDays;
  let advice = 'Target berat badan sudah tercapai! Jaga asupan sesuai TDEE dan olahraga ringan rutin.';

  if (weightDiffKg < -0.05) {
    direction = 'lose';
    const foodCut = Math.round(dailyGap * 0.65);
    const rawFood = Math.round(tdee - foodCut);
    if (rawFood < safeFloor) {
      suggestedFood = safeFloor;
      const actualFoodCut = Math.max(0, Math.round(tdee - safeFloor));
      suggestedExercise = Math.max(0, dailyGap - actualFoodCut);
    } else {
      suggestedFood = rawFood;
      suggestedExercise = Math.max(0, dailyGap - foodCut);
    }
    isAggressive = weeklyRateKg > 1.0 || dailyGap > 1000 || suggestedExercise > 600;
    recommendedMinDays = Math.max(7, Math.ceil((absDiff * 7) / 0.75));
    advice = isAggressive
      ? `Target turun ${absDiff} kg dalam ${durationDays} hari cukup ketat (${weeklyRateKg} kg/minggu). Pertimbangkan durasi minimal sekitar ${recommendedMinDays} hari agar lebih sehat.`
      : `Untuk turun ${absDiff} kg tepat waktu, kombinasikan makan sekitar ${suggestedFood} kkal/hari dan bakar sekitar ${suggestedExercise} kkal/hari lewat olahraga.`;
  } else if (weightDiffKg > 0.05) {
    direction = 'gain';
    suggestedExercise = 150;
    suggestedFood = Math.round(tdee + dailyGap + suggestedExercise);
    isAggressive = weeklyRateKg > 0.5;
    recommendedMinDays = Math.max(14, Math.ceil((absDiff * 7) / 0.4));
    advice = isAggressive
      ? `Target naik ${absDiff} kg dalam ${durationDays} hari cukup cepat (${weeklyRateKg} kg/minggu). Disarankan durasi minimal ${recommendedMinDays} hari.`
      : `Untuk naik ${absDiff} kg secara sehat, konsumsi sekitar ${suggestedFood} kkal/hari diimbangi latihan kekuatan (~${suggestedExercise} kkal/hari).`;
  } else if (goalType === 'lose') {
    direction = 'maintain';
  }

  const walkKcalPerMin = (4.3 * 3.5 * currentWeightKg) / 200;
  const jogKcalPerMin = (8.3 * 3.5 * currentWeightKg) / 200;
  const walkMinEquiv = suggestedExercise > 0 && walkKcalPerMin > 0 ? Math.round(suggestedExercise / walkKcalPerMin) : 0;
  const walkKmEquiv = walkMinEquiv > 0 ? Math.round(((walkMinEquiv / 60) * 6.0) * 10) / 10 : 0;
  const jogMinEquiv = suggestedExercise > 0 && jogKcalPerMin > 0 ? Math.round(suggestedExercise / jogKcalPerMin) : 0;

  return {
    direction,
    duration_days: durationDays,
    start_date: startStr,
    target_end_date: targetEndDate,
    days_elapsed: 1,
    days_remaining: Math.max(0, durationDays - 1),
    effective_days: durationDays,
    weight_diff_kg: weightDiffKg,
    total_calories_needed: totalCaloriesNeeded,
    daily_gap_kcal: dailyGap,
    weekly_rate_kg: weeklyRateKg,
    suggested_food_calories: suggestedFood,
    suggested_exercise_burn: suggestedExercise,
    is_aggressive: isAggressive,
    recommended_min_days: recommendedMinDays,
    walk_min_equiv: walkMinEquiv,
    walk_km_equiv: walkKmEquiv,
    jog_min_equiv: jogMinEquiv,
    advice,
  };
}

export function previewFoodNutrition(
  food: FoodItem,
  quantity: number,
  unit: string
): { calories: number; protein: number; carbs: number; fat: number } | null {
  if (quantity <= 0 || food.serving_grams <= 0) return null;
  const u = unit.trim().toLowerCase();
  const grams = u === 'gram' || u === 'g' ? quantity : quantity * food.serving_grams;
  const factor = grams / 100;
  return {
    calories: Math.round(factor * food.calories_per_100g),
    protein: Math.round(factor * food.protein_per_100g * 10) / 10,
    carbs: Math.round(factor * food.carbs_per_100g * 10) / 10,
    fat: Math.round(factor * food.fat_per_100g * 10) / 10,
  };
}

export function previewActivityCalories(
  activity: ActivityItem,
  inputValue: number,
  inputUnit: ActivityUnit,
  weightKg: number
): { caloriesBurned: number; durationMinutes: number; distanceMeters: number | null } | null {
  if (inputValue <= 0 || weightKg <= 0 || activity.met <= 0) return null;

  let durationMinutes = 0;
  let distanceMeters: number | null = null;

  if (inputUnit === 'menit') {
    durationMinutes = inputValue;
  } else {
    if (!activity.supports_distance || !activity.default_speed_kmh || activity.default_speed_kmh <= 0) {
      return null;
    }
    const distanceKm = inputUnit === 'm' ? inputValue / 1000 : inputValue;
    distanceMeters = Math.round(distanceKm * 1000 * 100) / 100;
    durationMinutes = (distanceKm / activity.default_speed_kmh) * 60;
  }

  const caloriesBurned = Math.round(((activity.met * 3.5 * weightKg) / 200) * durationMinutes);
  return {
    caloriesBurned,
    durationMinutes: Math.round(durationMinutes * 100) / 100,
    distanceMeters,
  };
}

export function getLocalDateIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftDateIso(dateIso: string, deltaDays: number): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  return getLocalDateIso(dt);
}

export function formatDateId(dateIso: string, short = false): string {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (short) {
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(dt);
  }
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(dt);
}

export function formatNum(val: number, decimals = 0): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatWeightTooltipValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'Belum timbang';
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 'Belum timbang';
  }
  return `${formatNum(num, 2)} kg`;
}
