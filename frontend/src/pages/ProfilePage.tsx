import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CalendarClock, Download, KeyRound, Loader2, Plus, Save, Scale, Trash2 } from 'lucide-react';
import type { ActivityLevel, CurrentMetrics, Gender, GoalType, UserProfile, WeightLog } from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from '../components/FormStatusBanner';
import { PasswordInput } from '../components/PasswordInput';
import {
  ACTIVITY_LEVEL_LABELS,
  GOAL_LABELS,
  formatDateId,
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

interface ProfilePageProps {
  profile: UserProfile;
  metrics: CurrentMetrics;
  weightLogs: WeightLog[];
  onProfileUpdated: () => Promise<void>;
  onOpenWeightModal: () => void;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  metrics,
  weightLogs,
  onProfileUpdated,
  onOpenWeightModal,
  onNotify,
}) => {
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [age, setAge] = useState(String(profile.age));
  const [heightCm, setHeightCm] = useState(String(profile.height_cm));
  const [initialWeight, setInitialWeight] = useState(String(profile.initial_weight_kg));
  const [targetWeight, setTargetWeight] = useState(profile.target_weight_kg ? String(profile.target_weight_kg) : '');
  const [durationDays, setDurationDays] = useState(
    profile.program_duration_days ? String(profile.program_duration_days) : ''
  );
  const [programStartDate, setProgramStartDate] = useState(profile.program_start_date || getLocalDateIso());
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activity_level);
  const [goalType, setGoalType] = useState<GoalType>(profile.goal_type);
  const [isManualTarget, setIsManualTarget] = useState(profile.is_manual_target);
  const [manualTarget, setManualTarget] = useState(
    String(profile.daily_calorie_target ?? metrics.recommended_calorie_target)
  );
  const [saving, setSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassStatus(null);
    if (!curPass || newPass.length < 6) {
      const msg = 'Isi password saat ini dan password baru (minimal 6 karakter).';
      setPassStatus({ type: 'error', text: msg });
      onNotify('error', msg);
      return;
    }
    setChangingPass(true);
    try {
      await api.changePassword({ current_password: curPass, new_password: newPass });
      setCurPass('');
      setNewPass('');
      const msg = 'Password akun berhasil diubah.';
      setPassStatus({ type: 'success', text: msg });
      onNotify('success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah password.';
      setPassStatus({ type: 'error', text: msg });
      onNotify('error', msg);
    } finally {
      setChangingPass(false);
    }
  };

  useEffect(() => {
    setName(profile.name);
    setGender(profile.gender);
    setAge(String(profile.age));
    setHeightCm(String(profile.height_cm));
    setInitialWeight(String(profile.initial_weight_kg));
    setTargetWeight(profile.target_weight_kg ? String(profile.target_weight_kg) : '');
    setDurationDays(profile.program_duration_days ? String(profile.program_duration_days) : '');
    setProgramStartDate(profile.program_start_date || getLocalDateIso());
    setActivityLevel(profile.activity_level);
    setGoalType(profile.goal_type);
    setIsManualTarget(profile.is_manual_target);
    setManualTarget(String(profile.daily_calorie_target ?? metrics.recommended_calorie_target));
  }, [profile, metrics]);

  const preview = useMemo(() => {
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    if (!h || !a) return null;
    return previewProfileMetrics({
      weightKg: metrics.current_weight_kg,
      heightCm: h,
      age: Math.round(a),
      gender,
      activityLevel,
      goalType,
    });
  }, [metrics.current_weight_kg, heightCm, age, gender, activityLevel, goalType]);

  const dietPlanPreview = useMemo(() => {
    if (!preview) return null;
    const tw = targetWeight.trim() ? parseDecimalInput(targetWeight) : null;
    const dur = durationDays.trim() ? Math.round(parseDecimalInput(durationDays) ?? 0) : null;
    if (!tw || !dur || dur < 7) return null;
    return previewDietPlan({
      currentWeightKg: metrics.current_weight_kg,
      targetWeightKg: tw,
      durationDays: dur,
      tdee: preview.tdee,
      gender,
      goalType,
      startDate: programStartDate || getLocalDateIso(),
    });
  }, [preview, metrics.current_weight_kg, targetWeight, durationDays, gender, goalType, programStartDate]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseDecimalInput(heightCm);
    const a = parseDecimalInput(age);
    const iw = parseDecimalInput(initialWeight);
    const tw = targetWeight.trim() ? parseDecimalInput(targetWeight) : null;
    const mt = isManualTarget ? parseDecimalInput(manualTarget) : null;
    const durRaw = durationDays.trim() ? parseDecimalInput(durationDays) : null;
    const dur = durRaw && durRaw > 0 ? Math.round(durRaw) : null;

    if (!h || !a || !iw) {
      const msg = 'Pastikan tinggi badan, usia, dan berat badan awal valid.';
      setProfileStatus({ type: 'error', text: msg });
      onNotify('error', msg);
      return;
    }
    if (dur !== null && (dur < 7 || dur > 730)) {
      const msg = 'Durasi program harus antara 7 sampai 730 hari (atau kosongkan untuk fleksibel).';
      setProfileStatus({ type: 'error', text: msg });
      onNotify('error', msg);
      return;
    }

    setSaving(true);
    setProfileStatus(null);
    try {
      await api.saveProfile({
        name: name.trim(),
        gender,
        age: Math.round(a),
        height_cm: h,
        initial_weight_kg: iw,
        target_weight_kg: tw,
        activity_level: activityLevel,
        goal_type: goalType,
        is_manual_target: isManualTarget,
        daily_calorie_target: mt ? Math.round(mt) : null,
        program_duration_days: tw ? dur : null,
        program_start_date: tw && dur ? programStartDate || getLocalDateIso() : null,
      });
      await onProfileUpdated();
      const msg = 'Profil & target program diet berhasil disimpan.';
      setProfileStatus({ type: 'success', text: msg });
      onNotify('success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui profil.';
      setProfileStatus({ type: 'error', text: msg });
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWeight = async (w: WeightLog) => {
    if (!window.confirm(`Hapus catatan berat badan ${formatNum(w.weight_kg, 1)} kg pada ${formatDateId(w.log_date, true)}?`)) {
      return;
    }
    try {
      await api.deleteWeightLog(w.id);
      await onProfileUpdated();
      onNotify('success', 'Catatan berat badan dihapus.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus berat badan.');
    }
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const data = await api.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kaloriku-backup-${getLocalDateIso()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('success', 'File cadangan JSON berhasil diunduh.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengekspor data.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Profil &amp; Program Diet</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola profil tubuh, target kalori harian, riwayat berat badan, dan cadangan data pribadi Anda.
          </p>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={handleExportJson}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold cursor-pointer self-start"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Menyiapkan File...' : 'Ekspor Cadangan (JSON)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Profile Form */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4"
        >
          <h3 className="text-base font-extrabold text-slate-900">Pengaturan Profil &amp; Target Kalori</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Panggilan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tinggi (cm)</label>
              <input
                type="text"
                inputMode="decimal"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Usia (thn)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">BB Awal (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={initialWeight}
                onChange={(e) => setInitialWeight(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target BB (kg)</label>
              <input
                type="text"
                inputMode="decimal"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="Opsional"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Aktivitas Harian</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {(Object.keys(ACTIVITY_LEVEL_LABELS) as ActivityLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {ACTIVITY_LEVEL_LABELS[lvl].title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tujuan Program</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {(Object.keys(GOAL_LABELS) as GoalType[]).map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g].title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Program Duration Planner */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-emerald-600" /> Durasi Target Program Diet
              </p>
              <span className="text-[11px] text-slate-500">Hitung keseimbangan makan &amp; olahraga tepat waktu</span>
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
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="prof-duration">
                  Durasi Program (hari)
                </label>
                <input
                  id="prof-duration"
                  type="number"
                  min={7}
                  max={730}
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Kosong = fleksibel"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="prof-start-date">
                  Tanggal Mulai Program
                </label>
                <input
                  id="prof-start-date"
                  type="date"
                  value={programStartDate}
                  onChange={(e) => setProgramStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            {dietPlanPreview && (
              <div className="pt-2 border-t border-emerald-200/70 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-emerald-200/80">
                    <p className="text-[11px] font-semibold text-slate-500">Saran Kalori Makan Harian</p>
                    <p className="text-lg font-extrabold text-emerald-700 tabular-nums">
                      {formatNum(dietPlanPreview.suggested_food_calories)} <span className="text-xs font-semibold">kkal/hari</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-amber-200/80">
                    <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-amber-500" /> Saran Bakar Olahraga Harian
                    </p>
                    <p className="text-lg font-extrabold text-amber-600 tabular-nums">
                      {formatNum(dietPlanPreview.suggested_exercise_burn)} <span className="text-xs font-semibold">kkal/hari</span>
                    </p>
                    {dietPlanPreview.suggested_exercise_burn > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ≈ jalan cepat {formatNum(dietPlanPreview.walk_km_equiv, 1)} km ({dietPlanPreview.walk_min_equiv} mnt) / jog {dietPlanPreview.jog_min_equiv} mnt
                      </p>
                    )}
                  </div>
                </div>
                {dietPlanPreview.is_aggressive && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{dietPlanPreview.advice}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auto vs Manual Calorie Target */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-slate-800">Target Kalori Masuk Harian</p>
                <p className="text-[11px] text-slate-500">
                  Rekomendasi otomatis berdasarkan BB terkini ({formatNum(metrics.current_weight_kg, 1)} kg):{' '}
                  <strong className="text-emerald-700">
                    {formatNum(
                      dietPlanPreview?.suggested_food_calories ??
                        preview?.recommendedCalories ??
                        metrics.recommended_calorie_target
                    )}{' '}
                    kkal/hari
                  </strong>
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isManualTarget}
                  onChange={(e) => setIsManualTarget(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                Atur Manual
              </label>
            </div>
            {isManualTarget && (
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualTarget}
                  onChange={(e) => setManualTarget(e.target.value)}
                  className="w-full sm:w-48 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-sm font-bold tabular-nums"
                />
                <span className="ml-2 text-xs text-slate-500">kkal / hari</span>
              </div>
            )}
          </div>

          {saving && <FormStatusBanner variant="loading" message="Menyimpan profil & menghitung ulang rencana target..." />}
          {!saving && profileStatus && <FormStatusBanner variant={profileStatus.type} message={profileStatus.text} />}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>

        {/* Weight History Panel */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" /> Riwayat Berat Badan
            </h3>
            <button
              type="button"
              onClick={onOpenWeightModal}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Catat BB
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-96 divide-y divide-slate-100">
            {weightLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Belum ada riwayat penimbangan berat badan.</p>
            ) : (
              weightLogs.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800 tabular-nums">{formatNum(w.weight_kg, 1)} kg</p>
                    <p className="text-xs text-slate-500">{formatDateId(w.log_date, true)}</p>
                    {w.notes && <p className="text-[11px] text-slate-400 italic">{w.notes}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus BB ${w.log_date}`}
                    onClick={() => handleDeleteWeight(w)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-700" />
          <h3 className="text-base font-extrabold text-slate-900">Keamanan Akun — Ubah Password</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password Saat Ini</label>
            <PasswordInput
              required
              value={curPass}
              onChange={(e) => setCurPass(e.target.value)}
              className="py-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password Baru (min. 6 karakter)</label>
            <PasswordInput
              required
              minLength={6}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="py-2"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={changingPass}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
            >
              {changingPass && <Loader2 className="w-4 h-4 animate-spin" />}
              {changingPass ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </div>
        {changingPass && <FormStatusBanner variant="loading" message="Memproses perubahan password akun..." />}
        {!changingPass && passStatus && <FormStatusBanner variant={passStatus.type} message={passStatus.text} />}
      </form>
    </div>
  );
};
