<<<<<<< HEAD
import React, { useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Flame,
  Plus,
  Scale,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { ActivityLog, DayLogsData, FoodLog, MealType } from '../types';
import { MEAL_LABELS, formatDateId, formatNum, getLocalDateIso, shiftDateIso } from '../utils/calculators';

interface DailyLogPageProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  dayData: DayLogsData | null;
  loading: boolean;
  onAddFood: (mealType: MealType) => void;
  onEditFood: (log: FoodLog) => void;
  onDeleteFood: (id: number) => Promise<void>;
  onAddActivity: () => void;
  onEditActivity: (log: ActivityLog) => void;
  onDeleteActivity: (id: number) => Promise<void>;
  onLogWeight: () => void;
}

const MEAL_ORDER: MealType[] = ['sarapan', 'siang', 'malam', 'camilan'];

export const DailyLogPage: React.FC<DailyLogPageProps> = ({
  selectedDate,
  onDateChange,
  dayData,
  loading,
  onAddFood,
  onEditFood,
  onDeleteFood,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onLogWeight,
}) => {
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const todayIso = getLocalDateIso();

  const handleConfirmDelete = async (kind: 'food' | 'act', id: number) => {
    const key = `${kind}-${id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    setConfirmDeleteKey(null);
    if (kind === 'food') await onDeleteFood(id);
    else await onDeleteActivity(id);
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Catatan Harian</h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDateId(selectedDate)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            aria-label="Hari sebelumnya"
            onClick={() => onDateChange(shiftDateIso(selectedDate, -1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
          />
          <button
            type="button"
            aria-label="Hari berikutnya"
            onClick={() => onDateChange(shiftDateIso(selectedDate, 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {selectedDate !== todayIso && (
            <button
              type="button"
              onClick={() => onDateChange(todayIso)}
              className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Day Summary Strip */}
      {dayData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Kalori Masuk</p>
            <p className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {formatNum(dayData.summary.calories_in)} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Kalori Aktivitas</p>
            <p className="text-xl font-extrabold text-amber-600 tabular-nums mt-1">
              {formatNum(dayData.summary.calories_burned)} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Sisa Kuota Target</p>
            <p
              className={`text-xl font-extrabold tabular-nums mt-1 ${
                dayData.summary.remaining_quota < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {dayData.summary.remaining_quota < 0 ? '-' : ''}
              {formatNum(Math.abs(dayData.summary.remaining_quota))} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Berat Badan</p>
              <p className="text-xl font-extrabold text-indigo-700 tabular-nums mt-1">
                {dayData.weight_log ? `${formatNum(dayData.weight_log.weight_kg, 1)} kg` : 'Belum ada'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogWeight}
              className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              title="Catat / ubah berat badan hari ini"
            >
              <Scale className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading && !dayData ? (
        <div className="h-48 bg-slate-200 rounded-3xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meal-Grouped Food Logs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" /> Catatan Makanan
              </h3>
            </div>

            {MEAL_ORDER.map((meal) => {
              const items = (dayData?.food_logs ?? []).filter((f) => f.meal_type === meal);
              const mealTotal = items.reduce((sum, i) => sum + i.calories, 0);
              return (
                <div key={meal} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{MEAL_LABELS[meal]}</span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg tabular-nums">
                        {formatNum(mealTotal)} kkal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddFood(meal)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-400">Belum ada catatan untuk {MEAL_LABELS[meal].toLowerCase()}.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const delKey = `food-${item.id}`;
                        return (
                          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{item.food_name}</p>
                              <p className="text-xs text-slate-500 tabular-nums">
                                {formatNum(item.quantity, item.quantity % 1 === 0 ? 0 : 1)} {item.unit}
                                {item.protein + item.carbs + item.fat > 0
                                  ? ` • P ${formatNum(item.protein, 1)}g • K ${formatNum(item.carbs, 1)}g • L ${formatNum(item.fat, 1)}g`
                                  : ''}
                              </p>
                              {item.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{item.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                                {formatNum(item.calories)} <span className="text-[11px] font-medium text-slate-400">kkal</span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Edit ${item.food_name}`}
                                onClick={() => onEditFood(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Hapus ${item.food_name}`}
                                onClick={() => handleConfirmDelete('food', item.id)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  confirmDeleteKey === delKey
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                {confirmDeleteKey === delKey ? 'Hapus?' : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Activity Logs Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Olahraga &amp; Aktivitas
              </h3>
              <button
                type="button"
                onClick={onAddActivity}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              {(dayData?.activity_logs ?? []).length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <Flame className="w-8 h-8 text-amber-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Belum ada aktivitas tercatat di tanggal ini. Catat jalan kaki 500 m, lari, atau olahraga lainnya!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(dayData?.activity_logs ?? []).map((act) => {
                    const delKey = `act-${act.id}`;
                    const unitLabel = act.input_unit === 'm' ? 'm' : act.input_unit;
                    return (
                      <div key={act.id} className="p-4 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">{act.activity_name}</p>
                          <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                            {formatNum(act.input_value, act.input_value % 1 === 0 ? 0 : 1)} {unitLabel}
                            {act.input_unit !== 'menit' && act.duration_minutes > 0
                              ? ` (~${formatNum(act.duration_minutes, 1)} mnt)`
                              : ''}
                            {' '}• BB {formatNum(act.weight_kg_used, 1)} kg
                          </p>
                          {act.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{act.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-extrabold text-amber-600 tabular-nums">
                            -{formatNum(act.calories_burned)} <span className="text-[11px]">kkal</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Edit ${act.activity_name}`}
                            onClick={() => onEditActivity(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${act.activity_name}`}
                            onClick={() => handleConfirmDelete('act', act.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              confirmDeleteKey === delKey
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            {confirmDeleteKey === delKey ? 'Hapus?' : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
=======
import React, { useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Flame,
  Plus,
  Scale,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { ActivityLog, DayLogsData, FoodLog, MealType } from '../types';
import { MEAL_LABELS, formatDateId, formatNum, getLocalDateIso, shiftDateIso } from '../utils/calculators';

interface DailyLogPageProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  dayData: DayLogsData | null;
  loading: boolean;
  onAddFood: (mealType: MealType) => void;
  onEditFood: (log: FoodLog) => void;
  onDeleteFood: (id: number) => Promise<void>;
  onAddActivity: () => void;
  onEditActivity: (log: ActivityLog) => void;
  onDeleteActivity: (id: number) => Promise<void>;
  onLogWeight: () => void;
}

const MEAL_ORDER: MealType[] = ['sarapan', 'siang', 'malam', 'camilan'];

export const DailyLogPage: React.FC<DailyLogPageProps> = ({
  selectedDate,
  onDateChange,
  dayData,
  loading,
  onAddFood,
  onEditFood,
  onDeleteFood,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onLogWeight,
}) => {
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const todayIso = getLocalDateIso();

  const handleConfirmDelete = async (kind: 'food' | 'act', id: number) => {
    const key = `${kind}-${id}`;
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key);
      return;
    }
    setConfirmDeleteKey(null);
    if (kind === 'food') await onDeleteFood(id);
    else await onDeleteActivity(id);
  };

  return (
    <div className="space-y-6">
      {/* Date Navigation Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Catatan Harian</h2>
          <p className="text-xs text-slate-500 mt-0.5">{formatDateId(selectedDate)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            aria-label="Hari sebelumnya"
            onClick={() => onDateChange(shiftDateIso(selectedDate, -1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && onDateChange(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
          />
          <button
            type="button"
            aria-label="Hari berikutnya"
            onClick={() => onDateChange(shiftDateIso(selectedDate, 1))}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {selectedDate !== todayIso && (
            <button
              type="button"
              onClick={() => onDateChange(todayIso)}
              className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
            >
              Hari Ini
            </button>
          )}
        </div>
      </div>

      {/* Day Summary Strip */}
      {dayData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Kalori Masuk</p>
            <p className="text-xl font-extrabold text-emerald-700 tabular-nums mt-1">
              {formatNum(dayData.summary.calories_in)} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Kalori Aktivitas</p>
            <p className="text-xl font-extrabold text-amber-600 tabular-nums mt-1">
              {formatNum(dayData.summary.calories_burned)} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase text-slate-400">Sisa Kuota Target</p>
            <p
              className={`text-xl font-extrabold tabular-nums mt-1 ${
                dayData.summary.remaining_quota < 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {dayData.summary.remaining_quota < 0 ? '-' : ''}
              {formatNum(Math.abs(dayData.summary.remaining_quota))} <span className="text-xs font-semibold">kkal</span>
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Berat Badan</p>
              <p className="text-xl font-extrabold text-indigo-700 tabular-nums mt-1">
                {dayData.weight_log ? `${formatNum(dayData.weight_log.weight_kg, 1)} kg` : 'Belum ada'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogWeight}
              className="p-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
              title="Catat / ubah berat badan hari ini"
            >
              <Scale className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading && !dayData ? (
        <div className="h-48 bg-slate-200 rounded-3xl animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meal-Grouped Food Logs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" /> Catatan Makanan
              </h3>
            </div>

            {MEAL_ORDER.map((meal) => {
              const items = (dayData?.food_logs ?? []).filter((f) => f.meal_type === meal);
              const mealTotal = items.reduce((sum, i) => sum + i.calories, 0);
              return (
                <div key={meal} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{MEAL_LABELS[meal]}</span>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg tabular-nums">
                        {formatNum(mealTotal)} kkal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddFood(meal)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-slate-400">Belum ada catatan untuk {MEAL_LABELS[meal].toLowerCase()}.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const delKey = `food-${item.id}`;
                        return (
                          <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{item.food_name}</p>
                              <p className="text-xs text-slate-500 tabular-nums">
                                {formatNum(item.quantity, item.quantity % 1 === 0 ? 0 : 1)} {item.unit}
                                {item.protein + item.carbs + item.fat > 0
                                  ? ` • P ${formatNum(item.protein, 1)}g • K ${formatNum(item.carbs, 1)}g • L ${formatNum(item.fat, 1)}g`
                                  : ''}
                              </p>
                              {item.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{item.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-extrabold text-slate-900 tabular-nums">
                                {formatNum(item.calories)} <span className="text-[11px] font-medium text-slate-400">kkal</span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Edit ${item.food_name}`}
                                onClick={() => onEditFood(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Hapus ${item.food_name}`}
                                onClick={() => handleConfirmDelete('food', item.id)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  confirmDeleteKey === delKey
                                    ? 'bg-rose-600 text-white'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                {confirmDeleteKey === delKey ? 'Hapus?' : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Activity Logs Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500" /> Olahraga &amp; Aktivitas
              </h3>
              <button
                type="button"
                onClick={onAddActivity}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              {(dayData?.activity_logs ?? []).length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <Flame className="w-8 h-8 text-amber-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    Belum ada aktivitas tercatat di tanggal ini. Catat jalan kaki 500 m, lari, atau olahraga lainnya!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(dayData?.activity_logs ?? []).map((act) => {
                    const delKey = `act-${act.id}`;
                    const unitLabel = act.input_unit === 'm' ? 'm' : act.input_unit;
                    return (
                      <div key={act.id} className="p-4 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">{act.activity_name}</p>
                          <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                            {formatNum(act.input_value, act.input_value % 1 === 0 ? 0 : 1)} {unitLabel}
                            {act.input_unit !== 'menit' && act.duration_minutes > 0
                              ? ` (~${formatNum(act.duration_minutes, 1)} mnt)`
                              : ''}
                            {' '}• BB {formatNum(act.weight_kg_used, 1)} kg
                          </p>
                          {act.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{act.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-extrabold text-amber-600 tabular-nums">
                            -{formatNum(act.calories_burned)} <span className="text-[11px]">kkal</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`Edit ${act.activity_name}`}
                            onClick={() => onEditActivity(act)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${act.activity_name}`}
                            onClick={() => handleConfirmDelete('act', act.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              confirmDeleteKey === delKey
                                ? 'bg-rose-600 text-white'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            {confirmDeleteKey === delKey ? 'Hapus?' : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
