import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Flame,
  Scale,
  TrendingDown,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardData, DashboardRange } from '../types';
import { formatDateId, formatNum, formatWeightTooltipValue } from '../utils/calculators';

interface DashboardPageProps {
  dashboard: DashboardData | null;
  userName?: string;
  range: DashboardRange;
  onRangeChange: (range: DashboardRange) => void;
  onOpenFoodModal: () => void;
  onOpenActivityModal: () => void;
  onOpenWeightModal: () => void;
  loading: boolean;
}

const RANGE_OPTIONS: { id: DashboardRange; label: string }[] = [
  { id: '7d', label: '7 Hari' },
  { id: '14d', label: '14 Hari' },
  { id: '30d', label: '30 Hari' },
  { id: 'all', label: 'Semua' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  dashboard,
  userName,
  range,
  onRangeChange,
  onOpenFoodModal,
  onOpenActivityModal,
  onOpenWeightModal,
  loading,
}) => {
  if (loading && !dashboard) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-44 bg-slate-200 rounded-3xl" />
          <div className="h-44 bg-slate-200 rounded-3xl" />
        </div>
        <div className="h-72 bg-slate-200 rounded-3xl" />
      </div>
    );
  }

  if (!dashboard) return null;

  const { today_summary: today, metrics, evaluation, calorie_series, weight_series } = dashboard;
  const totalBudget = today.daily_target + today.calories_burned;
  const progressPct = totalBudget > 0 ? Math.min(100, Math.round((today.calories_in / totalBudget) * 100)) : 0;
  const isOverBudget = today.remaining_quota < 0;

  // SVG gauge ring math
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  const evalStyle = {
    collecting: {
      bg: 'bg-slate-50 border-slate-200',
      badge: 'bg-slate-200 text-slate-700',
      icon: Clock,
    },
    on_track: {
      bg: 'bg-emerald-50/70 border-emerald-200',
      badge: 'bg-emerald-600 text-white',
      icon: CheckCircle2,
    },
    faster: {
      bg: 'bg-sky-50/70 border-sky-200',
      badge: 'bg-sky-600 text-white',
      icon: TrendingDown,
    },
    slower: {
      bg: 'bg-amber-50/70 border-amber-200',
      badge: 'bg-amber-500 text-white',
      icon: TrendingUp,
    },
  }[evaluation.status];
  const EvalIcon = evalStyle.icon;

  const targetWeight = weight_series.find((p) => p.target_weight !== null)?.target_weight ?? null;

  const calorieChartData = calorie_series.map((p) => ({
    ...p,
    label: formatDateId(p.date, true),
  }));

  const weightChartData = weight_series.map((p) => ({
    ...p,
    label: formatDateId(p.date, true),
  }));

  const macroTotal = Math.max(1, today.protein + today.carbs + today.fat);
  const bmiBadgeColor =
    metrics.bmi_category === 'Normal'
      ? 'bg-emerald-100 text-emerald-800'
      : metrics.bmi_category === 'Berat Badan Kurang'
        ? 'bg-sky-100 text-sky-800'
        : 'bg-amber-100 text-amber-800';

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Halo{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{formatDateId(today.date)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenFoodModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Utensils className="w-4 h-4" /> Catat Makan
          </button>
          <button
            type="button"
            onClick={onOpenActivityModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Activity className="w-4 h-4" /> Catat Aktivitas
          </button>
          <button
            type="button"
            onClick={onOpenWeightModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-xs transition cursor-pointer"
          >
            <Scale className="w-4 h-4" /> Catat Berat Badan
          </button>
        </div>
      </div>

      {/* Hero Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Calorie Progress Ring */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-5">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="9" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={isOverBudget ? '#f43f5e' : '#10b981'}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-lg font-extrabold text-slate-900 tabular-nums">{progressPct}%</span>
              <span className="text-[10px] font-semibold text-slate-400">dari kuota</span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kalori Masuk Hari Ini</p>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">
              {formatNum(today.calories_in)} <span className="text-xs font-semibold text-slate-400">kkal</span>
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              Target {formatNum(today.daily_target)}
              {today.calories_burned > 0 ? ` + ${formatNum(today.calories_burned)} olahraga` : ''} kkal
            </p>
            <div
              className={`inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${
                isOverBudget ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {isOverBudget
                ? `Melebihi ${formatNum(Math.abs(today.remaining_quota))} kkal`
                : `Sisa ${formatNum(today.remaining_quota)} kkal`}
            </div>
          </div>
        </div>

        {/* Card 2: Burned Calories & Net Balance */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Kalori Keluar Aktivitas</p>
              <p className="text-3xl font-extrabold text-amber-600 tabular-nums mt-1">
                {formatNum(today.calories_burned)} <span className="text-sm font-semibold text-amber-500">kkal</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Aktivitas tercatat hari ini</span>
              <span className="font-bold text-slate-800 tabular-nums">{today.activity_count} aktivitas</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total pengeluaran (TDEE + Olahraga)</span>
              <span className="font-bold text-slate-800 tabular-nums">{formatNum(Math.round(today.total_expenditure))} kkal</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Keseimbangan hari ini</span>
              <span
                className={`font-bold tabular-nums ${
                  today.calorie_balance <= 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {today.calorie_balance > 0 ? '+' : ''}
                {formatNum(Math.round(today.calorie_balance))} kkal
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Latest Weight & BMI */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Berat Badan Terkini</p>
              <p className="text-3xl font-extrabold text-indigo-700 tabular-nums mt-1">
                {formatNum(metrics.current_weight_kg, 1)}{' '}
                <span className="text-sm font-semibold text-indigo-400">kg</span>
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${bmiBadgeColor}`}>
              BMI {formatNum(metrics.bmi, 1)} • {metrics.bmi_category}
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Perubahan dari BB awal ({formatNum(metrics.initial_weight_kg, 1)} kg)</span>
              <span
                className={`font-bold tabular-nums ${
                  metrics.weight_change_from_start_kg <= 0 ? 'text-emerald-600' : 'text-indigo-600'
                }`}
              >
                {metrics.weight_change_from_start_kg > 0 ? '+' : ''}
                {formatNum(metrics.weight_change_from_start_kg, 1)} kg
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Status timbang hari ini</span>
              <span className="font-bold text-slate-800">
                {today.weight_on_date !== null ? `${formatNum(today.weight_on_date, 1)} kg` : 'Belum dicatat'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Daily Macros Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ringkasan Makro Hari Ini</span>
          <div className="flex flex-wrap gap-4 text-xs font-semibold tabular-nums">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Protein: {formatNum(today.protein, 1)} g
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Karbohidrat: {formatNum(today.carbs, 1)} g
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Lemak: {formatNum(today.fat, 1)} g
            </span>
          </div>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
          <div
            style={{ width: `${(today.protein / macroTotal) * 100}%` }}
            className="bg-emerald-500 transition-all"
          />
          <div style={{ width: `${(today.carbs / macroTotal) * 100}%` }} className="bg-sky-500 transition-all" />
          <div style={{ width: `${(today.fat / macroTotal) * 100}%` }} className="bg-amber-400 transition-all" />
        </div>
      </div>

      {/* Diet Evaluation Card (Kalori vs Perkembangan BB) */}
      <div className={`rounded-3xl p-5 sm:p-6 border ${evalStyle.bg} transition`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900">Evaluasi Program Diet (Kalori vs BB)</h3>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${evalStyle.badge}`}>
                <EvalIcon className="w-3.5 h-3.5" />
                {evaluation.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Membandingkan perubahan berat badan aktual dengan estimasi teoritis dari catatan kalori (1 kg ≈ 7.700 kkal)
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-white/80 border border-slate-200/80 self-start">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onRangeChange(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  range === opt.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/70">
            <p className="text-[11px] font-semibold text-slate-500">Perubahan BB Aktual</p>
            <p className="text-xl font-extrabold text-indigo-700 tabular-nums mt-0.5">
              {evaluation.actual_delta_kg !== null
                ? `${evaluation.actual_delta_kg > 0 ? '+' : ''}${formatNum(evaluation.actual_delta_kg, 2)} kg`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {evaluation.weight_days} hari timbang
              {evaluation.start_date && evaluation.end_date
                ? ` (${formatDateId(evaluation.start_date, true)} – ${formatDateId(evaluation.end_date, true)})`
                : ''}
            </p>
          </div>

          <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/70">
            <p className="text-[11px] font-semibold text-slate-500">Estimasi Teoritis dari Kalori</p>
            <p className="text-xl font-extrabold text-emerald-700 tabular-nums mt-0.5">
              {evaluation.calorie_days > 0
                ? `${evaluation.theoretical_delta_kg > 0 ? '+' : ''}${formatNum(evaluation.theoretical_delta_kg, 2)} kg`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {evaluation.calorie_days} hari tercatat ({evaluation.cumulative_balance_kcal > 0 ? '+' : ''}
              {formatNum(evaluation.cumulative_balance_kcal)} kkal)
            </p>
          </div>

          <div className="bg-white/90 rounded-2xl p-3.5 border border-slate-200/70">
            <p className="text-[11px] font-semibold text-slate-500">Selisih Aktual vs Estimasi</p>
            <p className="text-xl font-extrabold text-slate-800 tabular-nums mt-0.5">
              {evaluation.difference_kg !== null && evaluation.status !== 'collecting'
                ? `${evaluation.difference_kg > 0 ? '+' : ''}${formatNum(evaluation.difference_kg, 2)} kg`
                : 'Menunggu data'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Batas wajar konsistensi: ±0,5 kg</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">{evaluation.explanation}</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Weight Trend */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-900">Tren Berat Badan vs Proyeksi Kalori</h3>
            <p className="text-xs text-slate-500">
              Bandingkan garis BB aktual (indigo) dengan garis proyeksi teoritis dari kalori (hijau)
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weightChartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#64748b' }} unit=" kg" />
                <Tooltip
                  contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', fontSize: 12 }}
                  formatter={(value: number | string, name: string) => [formatWeightTooltipValue(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {targetWeight !== null && (
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: `Target ${targetWeight} kg`, position: 'insideTopRight', fontSize: 11, fill: '#b45309' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actual_weight"
                  name="BB Aktual"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#4f46e5' }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="moving_avg_7d"
                  name="Rata-rata 7 Hari"
                  stroke="#94a3b8"
                  strokeWidth={1.8}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="projected_weight"
                  name="Proyeksi Teoritis"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Calories */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-extrabold text-slate-900">Kalori Masuk vs Kalori Keluar Harian</h3>
            <p className="text-xs text-slate-500">
              Perbandingan asupan makanan, pembakaran aktivitas, dan target kalori harian Anda
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={calorieChartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ borderRadius: 14, borderColor: '#e2e8f0', fontSize: 12 }}
                  formatter={(value: number | string, name: string) => [`${formatNum(Number(value))} kkal`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="calories_in" name="Kalori Masuk" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="calories_burned" name="Kalori Aktivitas" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target Harian"
                  stroke="#0f172a"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
