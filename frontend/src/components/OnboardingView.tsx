<<<<<<< HEAD
import React, { useMemo, useState } from 'react';
import { Flame, Sparkles, ArrowRight } from 'lucide-react';
import type { ActivityLevel, Gender, GoalType, ProfileResponse } from '../types';
import { api } from '../api/client';
import {
  ACTIVITY_LEVEL_LABELS,
  GOAL_LABELS,
  formatNum,
  getLocalDateIso,
  parseDecimalInput,
  previewProfileMetrics,
} from '../utils/calculators';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const w = parseDecimalInput(weightKg);
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    const tw = targetWeightKg.trim() ? parseDecimalInput(targetWeightKg) : null;

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

    setSubmitting(true);
    try {
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
        initial_date: getLocalDateIso(),
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
              <div className="grid grid-cols-3 gap-2">
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

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Mulai Program Diet'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Live Preview Card */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-lg">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Pratinjau Otomatis
              </div>
              <h2 className="text-lg font-bold mb-1">Estimasi Program Anda</h2>
              <p className="text-xs text-slate-400 mb-6">
                Angka ini otomatis menyesuaikan saat berat badan Anda bertambah atau berkurang nanti.
              </p>

              {preview ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-xs text-slate-300">Rekomendasi Target Kalori Masuk</p>
                    <p className="text-3xl font-extrabold text-emerald-400 tabular-nums mt-1">
                      {formatNum(preview.recommendedCalories)}{' '}
                      <span className="text-sm font-semibold text-emerald-200">kkal / hari</span>
                    </p>
                  </div>

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
=======
import React, { useMemo, useState } from 'react';
import { Flame, Sparkles, ArrowRight } from 'lucide-react';
import type { ActivityLevel, Gender, GoalType, ProfileResponse } from '../types';
import { api } from '../api/client';
import {
  ACTIVITY_LEVEL_LABELS,
  GOAL_LABELS,
  formatNum,
  getLocalDateIso,
  parseDecimalInput,
  previewProfileMetrics,
} from '../utils/calculators';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const w = parseDecimalInput(weightKg);
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    const tw = targetWeightKg.trim() ? parseDecimalInput(targetWeightKg) : null;

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

    setSubmitting(true);
    try {
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
        initial_date: getLocalDateIso(),
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
              <div className="grid grid-cols-3 gap-2">
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

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Mulai Program Diet'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Live Preview Card */}
          <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-lg">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Pratinjau Otomatis
              </div>
              <h2 className="text-lg font-bold mb-1">Estimasi Program Anda</h2>
              <p className="text-xs text-slate-400 mb-6">
                Angka ini otomatis menyesuaikan saat berat badan Anda bertambah atau berkurang nanti.
              </p>

              {preview ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <p className="text-xs text-slate-300">Rekomendasi Target Kalori Masuk</p>
                    <p className="text-3xl font-extrabold text-emerald-400 tabular-nums mt-1">
                      {formatNum(preview.recommendedCalories)}{' '}
                      <span className="text-sm font-semibold text-emerald-200">kkal / hari</span>
                    </p>
                  </div>

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
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
