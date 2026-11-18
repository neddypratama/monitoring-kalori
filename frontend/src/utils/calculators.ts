import type { ActivityItem, ActivityLevel, ActivityUnit, FoodItem, Gender, GoalType } from '../types';

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
