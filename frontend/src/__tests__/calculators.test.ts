import { describe, expect, it } from 'vitest';
import {
  parseDecimalInput,
  previewProfileMetrics,
  previewDietPlan,
  previewFoodNutrition,
  previewActivityCalories,
  formatWeightTooltipValue,
} from '../utils/calculators';
import { buildApiUrl } from '../api/client';

describe('calculators preview & decimal parsing', () => {
  it('parses Indonesian comma decimals, dots, and rejects empty/invalid strings', () => {
    expect(parseDecimalInput('68,5')).toBe(68.5);
    expect(parseDecimalInput(' 1.5 ')).toBe(1.5);
    expect(parseDecimalInput('500')).toBe(500);
    expect(parseDecimalInput('')).toBeNull();
    expect(parseDecimalInput('abc')).toBeNull();
  });

  it('computes BMI Kemenkes RI, BMR Mifflin-St Jeor, TDEE, and safe floors', () => {
    const male = previewProfileMetrics({
      weightKg: 70,
      heightCm: 170,
      age: 25,
      gender: 'male',
      activityLevel: 'sedentary',
      goalType: 'lose',
    });
    expect(male).not.toBeNull();
    expect(male!.bmi).toBe(24.2);
    expect(male!.bmiCategory).toBe('Normal');
    expect(male!.bmr).toBe(1642.5);
    expect(male!.tdee).toBe(1971);
    expect(male!.recommendedCalories).toBe(1500); // floor 1500 for male (1971 - 500 = 1471 -> 1500)

    const female = previewProfileMetrics({
      weightKg: 55,
      heightCm: 160,
      age: 25,
      gender: 'female',
      activityLevel: 'sedentary',
      goalType: 'lose',
    });
    expect(female!.recommendedCalories).toBe(1200); // floor 1200 for female
  });

  it('computes food calories & macros for default_unit and gram', () => {
    const nasi = {
      id: 1,
      name: 'Nasi Putih',
      category: 'Makanan Pokok',
      default_unit: 'piring',
      serving_grams: 150,
      calories_per_100g: 130,
      protein_per_100g: 2.7,
      carbs_per_100g: 28.0,
      fat_per_100g: 0.3,
      is_custom: false,
      is_favorite: false,
    };

    expect(previewFoodNutrition(nasi, 1.5, 'piring')).toEqual({
      calories: 293,
      protein: 6.1,
      carbs: 63.0,
      fat: 0.7,
    });
    expect(previewFoodNutrition(nasi, 100, 'gram')).toEqual({
      calories: 130,
      protein: 2.7,
      carbs: 28.0,
      fat: 0.3,
    });
  });

  it('computes walking 500 m at 70 kg (~27 kcal) and rejects distance unit for Yoga', () => {
    const jalan = {
      id: 1,
      name: 'Jalan Santai',
      category: 'Jalan & Lari',
      met: 3.3,
      supports_distance: true,
      default_speed_kmh: 4.5,
      is_custom: false,
      is_favorite: false,
    };
    const res = previewActivityCalories(jalan, 500, 'm', 70);
    expect(res).toEqual({
      caloriesBurned: 27,
      durationMinutes: 6.67,
      distanceMeters: 500,
    });

    const yoga = {
      id: 2,
      name: 'Yoga',
      category: 'Kekuatan',
      met: 3.0,
      supports_distance: false,
      default_speed_kmh: null,
      is_custom: false,
      is_favorite: false,
    };
    expect(previewActivityCalories(yoga, 500, 'm', 70)).toBeNull();
    expect(previewActivityCalories(yoga, 30, 'menit', 70)?.caloriesBurned).toBe(110);
  });

  it('builds relative ./api.php URLs without hardcoded root paths', () => {
    const url = buildApiUrl('dashboard', { range: '7d', date: '2026-11-18' });
    expect(url.startsWith('./api.php?route=dashboard')).toBe(true);
    expect(url).toContain('range=7d');
    expect(url).toContain('date=2026-11-18');
  });

  it('formats null/undefined weight tooltip values safely instead of 0,00 kg', () => {
    expect(formatWeightTooltipValue(null)).toBe('Belum timbang');
    expect(formatWeightTooltipValue(undefined)).toBe('Belum timbang');
    expect(formatWeightTooltipValue('')).toBe('Belum timbang');
    expect(formatWeightTooltipValue(69.5)).toBe('69,50 kg');
  });

  it('computes 3-month balanced diet plan (food + exercise), enforces safe floor, and flags aggressive pace', () => {
    // 78 kg -> 70 kg in 90 days (8 kg * 7700 / 90 = 684 kcal/day gap), TDEE 2200, male
    const balanced = previewDietPlan({
      currentWeightKg: 78,
      targetWeightKg: 70,
      durationDays: 90,
      tdee: 2200,
      gender: 'male',
      goalType: 'lose',
      startDate: '2026-11-18',
    });
    expect(balanced).not.toBeNull();
    expect(balanced!.direction).toBe('lose');
    expect(balanced!.daily_gap_kcal).toBe(684);
    expect(balanced!.suggested_food_calories).toBe(1755); // 2200 - round(684 * 0.65 = 445)
    expect(balanced!.suggested_exercise_burn).toBe(239); // 684 - 445
    expect(balanced!.is_aggressive).toBe(false);
    expect(balanced!.walk_min_equiv).toBeGreaterThan(0);

    // Aggressive target: 75 kg -> 60 kg in 30 days (female, floor 1200)
    const aggressive = previewDietPlan({
      currentWeightKg: 75,
      targetWeightKg: 60,
      durationDays: 30,
      tdee: 1700,
      gender: 'female',
      goalType: 'lose',
      startDate: '2026-11-18',
    });
    expect(aggressive).not.toBeNull();
    expect(aggressive!.suggested_food_calories).toBe(1200); // safe female floor
    expect(aggressive!.is_aggressive).toBe(true);
    expect(aggressive!.recommended_min_days).toBeGreaterThan(30);
  });
});
