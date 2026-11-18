import React, { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, CalendarClock, Flame, Loader2, Sparkles } from 'lucide-react';
import type { ActivityLevel, Gender, GoalType, ProfileResponse } from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from './FormStatusBanner';
import {
  ACTIVITY_LEVEL_LABELS,
  GOAL_LABELS,
  formatNum,
  getLocalDateIso,
  parseDecimalInput,
  previewDietPlan,
  previewProfileMetrics,
} from '../utils/calculators';

const DURATION_PRESETS = [
  { label: '1 Bln (30 hr)', days: '30' },
  { label: '2 Bln (60 hr)', days: '60' },
  { label: '3 Bln (90 hr)', days: '90' },
  { label: '6 Bln (180 hr)', days: '180' },
  { label: 'Fleksibel', days: '' },
];

interface OnboardingViewProps {
  onComplete: (res: ProfileResponse) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('27');
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('72');
  const [targetWeightKg, setTargetWeightKg] = useState('65');
  const [durationDays, setDurationDays] = useState('90');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('sedentary');
  const [goalType, setGoalType] = useState<GoalType>('lose');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const w = parseDecimalInput(weightKg);
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    if (!w || !h || !a) return null;
    return previewProfileMetrics({
      weightKg: w,
      heightCm: h,
      age: Math.round(a),
      gender,
      activityLevel,
      goalType,
    });
  }, [weightKg, heightCm, age, gender, activityLevel, goalType]);

  const dietPlanPreview = useMemo(() => {
    if (!preview) return null;
    const w = parseDecimalInput(weightKg);
    const tw = targetWeightKg.trim() ? parseDecimalInput(targetWeightKg) : null;
    const dur = durationDays.trim() ? Math.round(parseDecimalInput(durationDays) ?? 0) : null;
    if (!w || !tw || !dur || dur < 7) return null;
    return previewDietPlan({
      currentWeightKg: w,
      targetWeightKg: tw,
      durationDays: dur,
      tdee: preview.tdee,
      gender,
      goalType,
      startDate: getLocalDateIso(),
    });
  }, [preview, weightKg, targetWeightKg, durationDays, gender, goalType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const w = parseDecimalInput(weightKg);
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    const tw = targetWeightKg.trim() ? parseDecimalInput(targetWeightKg) : null;
    const durRaw = durationDays.trim() ? parseDecimalInput(durationDays) : null;
    const dur = durRaw && durRaw > 0 ? Math.round(durRaw) : null;

    if (!w || w < 20 || w > 300) {
      setError('Masukkan berat badan yang valid (20–300 kg).');
      return;
    }
    if (!h || h < 80 || h > 250) {
      setError('Masukkan tinggi badan yang valid (80–250 cm).');
      return;
    }
    if (!a || a < 10 || a > 110) {
      setError('Masukkan usia yang valid (10–110 tahun).');
      return;
    }
    if (dur !== null && (dur < 7 || dur > 730)) {
      setError('Durasi program harus antara 7 hingga 730 hari (atau pilih Fleksibel).');
      return;
    }

    setSubmitting(true);
    try {
      const todayIso = getLocalDateIso();
      const res = await api.saveProfile({
        name: name.trim(),
        gender,
        age: Math.round(a),
        height_cm: h,
        initial_weight_kg: w,
        target_weight_kg: tw,
        activity_level: activityLevel,
        goal_type: goalType,
        is_manual_target: false,
        initial_date: todayIso,
        program_duration_days: tw ? dur : null,
        program_start_date: tw && dur ? todayIso : null,
      });
      onComplete(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Selamat Datang di KaloriKu</h1>
            <p className="text-sm text-slate-600">
              Atur profil singkat Anda agar sistem bisa menghitung kebutuhan kalori, kalori aktivitas, dan progres berat badan otomatis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-3 bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 space-y-5"
          >
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-name">
                Nama Panggilan <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
              <input
                id="ob-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Budi"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-weight">
                  Berat Badan Saat Ini (kg)
                </label>
                <input
                  id="ob-weight"
                  type="text"
                  inputMode="decimal"
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Contoh: 70,5"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-height">
                  Tinggi Badan (cm)
                </label>
                <input
                  id="ob-height"
                  type="text"
                  inputMode="decimal"
                  required
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="Contoh: 170"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-age">
                  Usia (tahun)
                </label>
                <input
                  id="ob-age"
                  type="number"
                  min={10}
                  max={110}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Kelamin</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Gender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                        gender === g
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {g === 'male' ? 'Laki-laki' : 'Perempuan'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-700 mb-1.5">Tujuan Program Diet</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['lose', 'maintain', 'gain'] as GoalType[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGoalType(g)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                      goalType === g
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{GOAL_LABELS[g].title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{GOAL_LABELS[g].desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-target-weight">
                  Target Berat Badan (kg) <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  id="ob-target-weight"
                  type="text"
                  inputMode="decimal"
                  value={targetWeightKg}
                  onChange={(e) => setTargetWeightKg(e.target.value)}
                  placeholder="Contoh: 65"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="ob-activity">
                  Tingkat Aktivitas Harian
                </label>
                <select
                  id="ob-activity"
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {ACTIVITY_LEVEL_LABELS[lvl].title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500 -mt-2">{ACTIVITY_LEVEL_LABELS[activityLevel].desc}</p>

            {/* Program Duration Planner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5" htmlFor="ob-duration">
                  <CalendarClock className="w-4 h-4 text-emerald-600" /> Durasi Target Program
                </label>
                <span className="text-[11px] text-slate-500">Hitung saran makan &amp; olahraga harian otomatis</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((preset) => {
                  const active = durationDays === preset.days;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDurationDays(preset.days)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="ob-duration"
                  type="number"
                  min={7}
                  max={730}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Kosong = fleksibel"
                  className="w-36 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">hari (misal 90 hari = 3 bulan)</span>
              </div>
            </div>

            {submitting && (
              <FormStatusBanner variant="loading" message="Menyimpan profil & menyiapkan rencana program diet Anda..." />
            )}
            {error && <FormStatusBanner variant="error" message={error} />}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Menyimpan...' : 'Mulai Program Diet'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Live Preview Card */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-lg">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Pratinjau Otomatis
              </div>
              <h2 className="text-lg font-bold mb-1">Estimasi Program Anda</h2>
              <p className="text-xs text-slate-400 mb-5">
                Angka ini otomatis menyesuaikan saat berat badan Anda bertambah atau berkurang nanti.
              </p>

              {preview ? (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-xs text-slate-300">
                      {dietPlanPreview ? 'Saran Target Kalori Makan' : 'Rekomendasi Target Kalori Masuk'}
                    </p>
                    <p className="text-3xl font-extrabold text-emerald-400 tabular-nums mt-1">
                      {formatNum(dietPlanPreview ? dietPlanPreview.suggested_food_calories : preview.recommendedCalories)}{' '}
                      <span className="text-sm font-semibold text-emerald-200">kkal / hari</span>
                    </p>
                    {dietPlanPreview && (
                      <p className="text-[11px] text-slate-300 mt-1 tabular-nums">
                        Target {formatNum(Math.abs(dietPlanPreview.weight_diff_kg), 1)} kg dalam {dietPlanPreview.duration_days} hari (~{formatNum(dietPlanPreview.weekly_rate_kg, 2)} kg/minggu)
                      </p>
                    )}
                  </div>

                  {dietPlanPreview && (
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/25">
                      <p className="text-xs text-amber-200 flex items-center gap-1.5 font-semibold">
                        <Activity className="w-3.5 h-3.5" /> Saran Bakar Olahraga Harian
                      </p>
                      <p className="text-2xl font-extrabold text-amber-300 tabular-nums mt-1">
                        {formatNum(dietPlanPreview.suggested_exercise_burn)}{' '}
                        <span className="text-xs font-semibold text-amber-200">kkal / hari</span>
                      </p>
                      {dietPlanPreview.suggested_exercise_burn > 0 && (
                        <p className="text-[11px] text-amber-100/80 mt-1 leading-relaxed">
                          Setara jalan cepat ±{formatNum(dietPlanPreview.walk_km_equiv, 1)} km ({dietPlanPreview.walk_min_equiv} mnt) atau jogging ~{dietPlanPreview.jog_min_equiv} mnt
                        </p>
                      )}
                    </div>
                  )}

                  {dietPlanPreview?.is_aggressive && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-xs text-rose-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                      <span>
                        Target cukup ketat ({formatNum(dietPlanPreview.weekly_rate_kg, 2)} kg/minggu). Disarankan minimal{' '}
                        <strong>{dietPlanPreview.recommended_min_days} hari</strong> agar tetap sehat &amp; aman.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[11px] text-slate-400">BMI (Kemenkes RI)</p>
                      <p className="text-xl font-bold tabular-nums mt-0.5">{formatNum(preview.bmi, 1)}</p>
                      <p className="text-xs text-emerald-300 font-medium mt-0.5">{preview.bmiCategory}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-[11px] text-slate-400">Kebutuhan Dasar (TDEE)</p>
                      <p className="text-xl font-bold tabular-nums mt-0.5">{formatNum(Math.round(preview.tdee))}</p>
                      <p className="text-xs text-slate-400 mt-0.5">BMR {formatNum(Math.round(preview.bmr))} kkal</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-white/5 text-sm text-slate-400">
                  Isi berat badan, tinggi badan, dan usia untuk melihat estimasi BMI &amp; kebutuhan kalori.
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 text-xs text-slate-400 leading-relaxed">
              Berat badan awal Anda juga akan otomatis tercatat sebagai entri pertama di grafik perkembangan BB harian.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
