<<<<<<< HEAD
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Flame, Globe, Loader2, Scale, Search, Star, Utensils, X } from 'lucide-react';
import type {
  ActivityItem,
  ActivityLog,
  ActivityUnit,
  FoodItem,
  FoodLog,
  MealType,
  OpenFoodFactsProduct,
} from '../types';
import { api } from '../api/client';
import {
  MEAL_LABELS,
  formatNum,
  parseDecimalInput,
  previewActivityCalories,
  previewFoodNutrition,
} from '../utils/calculators';

/* ==================== FOOD LOG MODAL ==================== */

interface FoodLogModalProps {
  isOpen: boolean;
  date: string;
  initialMealType?: MealType;
  editingLog?: FoodLog | null;
  foods: FoodItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onFoodCreated: (food: FoodItem) => void;
}

export const FoodLogModal: React.FC<FoodLogModalProps> = ({
  isOpen,
  date,
  initialMealType = 'siang',
  editingLog,
  foods,
  onClose,
  onSaved,
  onFoodCreated,
}) => {
  const [mode, setMode] = useState<'catalog' | 'online' | 'manual'>('catalog');
  const [logDate, setLogDate] = useState(date);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitMode, setUnitMode] = useState<'default' | 'gram'>('default');

  // Open Food Facts online search state
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<OpenFoodFactsProduct[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineSearched, setOnlineSearched] = useState(false);
  const [selectedOnline, setSelectedOnline] = useState<OpenFoodFactsProduct | null>(null);
  const [saveOnlineToCatalog, setSaveOnlineToCatalog] = useState(true);

  // Manual fields
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualUnit, setManualUnit] = useState('porsi');
  const [manualGrams, setManualGrams] = useState('150');
  const [manualCategory, setManualCategory] = useState('Masakan Jadi');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch('');
    setSaveToCatalog(false);
    setOnlineQuery('');
    setOnlineResults([]);
    setOnlineSearched(false);
    setSelectedOnline(null);
    setSaveOnlineToCatalog(true);

    if (editingLog) {
      setLogDate(editingLog.log_date);
      setMealType(editingLog.meal_type);
      setQuantity(String(editingLog.quantity));
      setNotes(editingLog.notes || '');
      const matched = editingLog.food_id ? foods.find((f) => f.id === editingLog.food_id) || null : null;
      if (matched) {
        setMode('catalog');
        setSelectedFood(matched);
        setUnitMode(editingLog.unit.toLowerCase() === 'gram' ? 'gram' : 'default');
      } else {
        setMode('manual');
        setSelectedFood(null);
        setManualName(editingLog.food_name);
        setManualCalories(String(editingLog.calories));
        setManualUnit(editingLog.unit);
      }
    } else {
      setLogDate(date);
      setMealType(initialMealType);
      setMode('catalog');
      setSelectedFood(null);
      setQuantity('1');
      setUnitMode('default');
      setManualName('');
      setManualCalories('');
      setManualUnit('porsi');
      setManualGrams('150');
      setNotes('');
    }
  }, [isOpen, date, initialMealType, editingLog, foods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? foods.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : foods;
    return list.slice(0, 30);
  }, [foods, search]);

  const activeFoodForPreview: FoodItem | null = useMemo(() => {
    if (mode === 'catalog') return selectedFood;
    if (mode === 'online' && selectedOnline) {
      return {
        id: 0,
        name: selectedOnline.name,
        category: 'Masakan Jadi',
        default_unit: selectedOnline.default_unit,
        serving_grams: selectedOnline.serving_grams,
        calories_per_100g: selectedOnline.calories_per_100g,
        protein_per_100g: selectedOnline.protein_per_100g,
        carbs_per_100g: selectedOnline.carbs_per_100g,
        fat_per_100g: selectedOnline.fat_per_100g,
        is_custom: true,
        is_favorite: false,
      };
    }
    return null;
  }, [mode, selectedFood, selectedOnline]);

  const activeUnit = activeFoodForPreview
    ? unitMode === 'gram'
      ? 'gram'
      : activeFoodForPreview.default_unit
    : 'porsi';
  const livePreview = useMemo(() => {
    if (!activeFoodForPreview) return null;
    const qty = parseDecimalInput(quantity);
    if (!qty || qty <= 0) return null;
    return previewFoodNutrition(activeFoodForPreview, qty, activeUnit);
  }, [activeFoodForPreview, quantity, activeUnit]);

  if (!isOpen) return null;

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setUnitMode('default');
    setQuantity('1');
    setError(null);
  };

  const handleSearchOnline = async () => {
    const q = onlineQuery.trim();
    if (q.length < 2) {
      setError('Ketik minimal 2 huruf nama produk (misal: Indomie, Ultra Milk, Milo).');
      return;
    }
    setError(null);
    setOnlineLoading(true);
    setOnlineSearched(true);
    setSelectedOnline(null);
    try {
      const items = await api.searchOpenFoodFacts(q);
      setOnlineResults(items);
    } catch (err) {
      setOnlineResults([]);
      setError(err instanceof Error ? err.message : 'Gagal mencari di Open Food Facts.');
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleSelectOnline = (item: OpenFoodFactsProduct) => {
    setSelectedOnline(item);
    setUnitMode('default');
    setQuantity('1');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = parseDecimalInput(quantity);
    if (!qty || qty <= 0) {
      setError('Jumlah porsi harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        if (!selectedFood) {
          setError('Pilih makanan dari daftar terlebih dahulu, atau gunakan tab Cari Online / Manual.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          meal_type: mealType,
          food_id: selectedFood.id,
          quantity: qty,
          unit: activeUnit,
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${selectedFood.name} berhasil dicatat.`);
        }
      } else if (mode === 'online') {
        if (!selectedOnline || !livePreview) {
          setError('Cari dan pilih produk Open Food Facts terlebih dahulu.');
          setSubmitting(false);
          return;
        }

        let createdFoodId: number | null = null;
        if (saveOnlineToCatalog) {
          const newFood = await api.createFood({
            name: selectedOnline.name,
            category: 'Camilan',
            default_unit: selectedOnline.default_unit,
            serving_grams: selectedOnline.serving_grams,
            calories_per_100g: selectedOnline.calories_per_100g,
            protein_per_100g: selectedOnline.protein_per_100g,
            carbs_per_100g: selectedOnline.carbs_per_100g,
            fat_per_100g: selectedOnline.fat_per_100g,
          });
          createdFoodId = newFood.id;
          onFoodCreated(newFood);
        }

        const payload = createdFoodId
          ? {
              log_date: logDate,
              meal_type: mealType,
              food_id: createdFoodId,
              quantity: qty,
              unit: activeUnit,
              notes: notes.trim(),
            }
          : {
              log_date: logDate,
              meal_type: mealType,
              food_id: null,
              food_name: selectedOnline.name,
              quantity: qty,
              unit: activeUnit,
              calories: livePreview.calories,
              protein: livePreview.protein,
              carbs: livePreview.carbs,
              fat: livePreview.fat,
              notes: notes.trim(),
            };

        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${selectedOnline.name} berhasil dicatat.`);
        }
      } else {
        const cal = parseDecimalInput(manualCalories);
        if (!manualName.trim()) {
          setError('Nama makanan wajib diisi.');
          setSubmitting(false);
          return;
        }
        if (cal === null || cal < 0) {
          setError('Masukkan estimasi kalori yang valid (0 atau lebih).');
          setSubmitting(false);
          return;
        }

        let createdFoodId: number | null = null;
        if (saveToCatalog && !editingLog) {
          const grams = parseDecimalInput(manualGrams) || 100;
          const calPer100 = Math.round(((cal / qty) / grams) * 100 * 10) / 10;
          const newFood = await api.createFood({
            name: manualName.trim(),
            category: manualCategory,
            default_unit: manualUnit.trim() || 'porsi',
            serving_grams: grams,
            calories_per_100g: calPer100,
          });
          createdFoodId = newFood.id;
          onFoodCreated(newFood);
        }

        const payload = createdFoodId
          ? {
              log_date: logDate,
              meal_type: mealType,
              food_id: createdFoodId,
              quantity: qty,
              unit: manualUnit.trim() || 'porsi',
              notes: notes.trim(),
            }
          : {
              log_date: logDate,
              meal_type: mealType,
              food_id: null,
              food_name: manualName.trim(),
              quantity: qty,
              unit: manualUnit.trim() || 'porsi',
              calories: Math.round(cal),
              notes: notes.trim(),
            };

        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${manualName.trim()} berhasil dicatat.`);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan catatan makanan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Makanan"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingLog ? 'Edit Catatan Makanan' : 'Catat Makanan & Minuman'}
              </h2>
              <p className="text-xs text-slate-500">Kalori otomatis dihitung dari porsi yang Anda pilih</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Date & Meal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-date">
                Tanggal
              </label>
              <input
                id="food-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-meal">
                Waktu Makan
              </label>
              <select
                id="food-meal"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
                  <option key={m} value={m}>
                    {MEAL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setMode('catalog')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'catalog' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Katalog ({foods.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('online')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1 ${
                mode === 'online' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Cari Online
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'manual' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Manual
            </button>
          </div>

          {mode === 'catalog' ? (
            <>
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari makanan... (misal: nasi goreng, ayam, kopi)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filteredFoods.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Makanan tidak ditemukan. Gunakan tab <strong>Input Manual / Baru</strong> untuk menambahkannya.
                    </div>
                  ) : (
                    filteredFoods.map((f) => {
                      const active = selectedFood?.id === f.id;
                      const perServing = Math.round((f.serving_grams / 100) * f.calories_per_100g);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleSelectFood(f)}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition cursor-pointer ${
                            active ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              {f.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                              <span className={`text-sm font-semibold truncate ${active ? 'text-emerald-800' : 'text-slate-800'}`}>
                                {f.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {f.category} • 1 {f.default_unit} ({f.serving_grams} g)
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-lg shrink-0 tabular-nums">
                            {perServing} kkal
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedFood && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-950">{selectedFood.name}</span>
                    <span className="text-xs text-emerald-700">{selectedFood.calories_per_100g} kkal / 100 g</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="food-qty">
                        Jumlah
                      </label>
                      <input
                        id="food-qty"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Contoh: 1 atau 1,5"
                        className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('default');
                            setQuantity('1');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer truncate ${
                            unitMode === 'default'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedFood.default_unit}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('gram');
                            setQuantity(String(selectedFood.serving_grams));
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            unitMode === 'gram'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          gram
                        </button>
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">
                          Estimasi Otomatis
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          P {formatNum(livePreview.protein, 1)}g • K {formatNum(livePreview.carbs, 1)}g • L {formatNum(livePreview.fat, 1)}g
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                          {formatNum(livePreview.calories)}
                        </span>{' '}
                        <span className="text-xs font-bold text-emerald-700">kkal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : mode === 'online' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchOnline();
                      }
                    }}
                    placeholder="Cari produk kemasan... (misal: Indomie, Ultra Milk, Milo)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchOnline}
                  disabled={onlineLoading}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  {onlineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Sumber data: <strong>Open Food Facts</strong> (detail kalori &amp; makro produk kemasan secara real-time).
              </p>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {onlineLoading ? (
                  <div className="p-5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> Mengambil data dari Open Food Facts...
                  </div>
                ) : !onlineSearched ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Ketik nama produk kemasan lalu klik <strong>Cari</strong>.
                  </div>
                ) : onlineResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Produk dengan data kalori tidak ditemukan. Coba kata kunci lain atau pakai tab Manual.
                  </div>
                ) : (
                  onlineResults.map((item, idx) => {
                    const active = selectedOnline?.code === item.code && selectedOnline?.name === item.name;
                    return (
                      <button
                        key={`${item.code}-${idx}`}
                        type="button"
                        onClick={() => handleSelectOnline(item)}
                        className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2.5 transition cursor-pointer ${
                          active ? 'bg-sky-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${active ? 'text-sky-900' : 'text-slate-800'}`}>
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              {item.calories_per_100g} kkal/100g • P {item.protein_per_100g}g • K {item.carbs_per_100g}g • L {item.fat_per_100g}g
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2 py-1 rounded-lg shrink-0 tabular-nums">
                          {item.calories_per_serving} kkal
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedOnline && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-sky-950 truncate">{selectedOnline.name}</span>
                    <span className="text-xs text-sky-700 shrink-0 tabular-nums">
                      {selectedOnline.calories_per_100g} kkal / 100 g
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="online-food-qty">
                        Jumlah
                      </label>
                      <input
                        id="online-food-qty"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('default');
                            setQuantity('1');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer truncate ${
                            unitMode === 'default'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedOnline.default_unit}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('gram');
                            setQuantity(String(selectedOnline.serving_grams));
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            unitMode === 'gram'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          gram
                        </button>
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-sky-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-sky-700">
                          Estimasi Otomatis
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          P {formatNum(livePreview.protein, 1)}g • K {formatNum(livePreview.carbs, 1)}g • L {formatNum(livePreview.fat, 1)}g
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-sky-700 tabular-nums">
                          {formatNum(livePreview.calories)}
                        </span>{' '}
                        <span className="text-xs font-bold text-sky-700">kkal</span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveOnlineToCatalog}
                      onChange={(e) => setSaveOnlineToCatalog(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600"
                    />
                    Simpan juga ke katalog pribadi agar bisa dipakai offline lain kali
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-name">
                  Nama Makanan / Minuman
                </label>
                <input
                  id="manual-food-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Nasi Campur Bu Ani"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-cal">
                    Total Kalori (kkal)
                  </label>
                  <input
                    id="manual-food-cal"
                    type="text"
                    inputMode="decimal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="350"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-qty">
                    Jumlah
                  </label>
                  <input
                    id="manual-food-qty"
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-unit">
                    Satuan
                  </label>
                  <input
                    id="manual-food-unit"
                    type="text"
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {!editingLog && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToCatalog}
                      onChange={(e) => setSaveToCatalog(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Simpan ke katalog pribadi agar bisa auto-hitung lain kali
                  </label>
                  {saveToCatalog && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                      >
                        {['Makanan Pokok', 'Lauk', 'Sayur', 'Masakan Jadi', 'Buah', 'Minuman', 'Camilan'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualGrams}
                        onChange={(e) => setManualGrams(e.target.value)}
                        placeholder="Gram per 1 porsi (mis. 150)"
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs tabular-nums"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="food-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: tanpa sambal, sedikit minyak"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editingLog ? 'Simpan Perubahan' : 'Simpan Makanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== ACTIVITY LOG MODAL ==================== */

interface ActivityLogModalProps {
  isOpen: boolean;
  date: string;
  currentWeightKg: number;
  editingLog?: ActivityLog | null;
  activities: ActivityItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  date,
  currentWeightKg,
  editingLog,
  activities,
  onClose,
  onSaved,
}) => {
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');
  const [logDate, setLogDate] = useState(date);
  const [search, setSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [inputValue, setInputValue] = useState('30');
  const [inputUnit, setInputUnit] = useState<ActivityUnit>('menit');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch('');
    if (editingLog) {
      setLogDate(editingLog.log_date);
      setInputValue(String(editingLog.input_value));
      setInputUnit(editingLog.input_unit);
      setNotes(editingLog.notes || '');
      const matched = editingLog.activity_id ? activities.find((a) => a.id === editingLog.activity_id) || null : null;
      if (matched) {
        setMode('catalog');
        setSelectedActivity(matched);
      } else {
        setMode('manual');
        setSelectedActivity(null);
        setManualName(editingLog.activity_name);
        setManualCalories(String(editingLog.calories_burned));
      }
    } else {
      setLogDate(date);
      setMode('catalog');
      setSelectedActivity(null);
      setInputValue('30');
      setInputUnit('menit');
      setManualName('');
      setManualCalories('');
      setNotes('');
    }
  }, [isOpen, date, editingLog, activities]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? activities.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
      : activities;
  }, [activities, search]);

  const livePreview = useMemo(() => {
    if (mode !== 'catalog' || !selectedActivity) return null;
    const val = parseDecimalInput(inputValue);
    if (!val || val <= 0) return null;
    return previewActivityCalories(selectedActivity, val, inputUnit, currentWeightKg);
  }, [mode, selectedActivity, inputValue, inputUnit, currentWeightKg]);

  if (!isOpen) return null;

  const handleSelectActivity = (act: ActivityItem) => {
    setSelectedActivity(act);
    setError(null);
    if (act.supports_distance) {
      // Keep current unit if valid; default nicely to 'm' for walking/running if coming from empty
      if (inputUnit === 'menit') {
        setInputUnit('m');
        setInputValue('500');
      }
    } else {
      setInputUnit('menit');
      if (inputUnit !== 'menit') setInputValue('30');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseDecimalInput(inputValue);
    if (!val || val <= 0) {
      setError('Nilai jarak atau durasi harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        if (!selectedActivity) {
          setError('Pilih aktivitas terlebih dahulu.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          activity_id: selectedActivity.id,
          input_value: val,
          input_unit: inputUnit,
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateActivityLog(editingLog.id, payload);
          onSaved('Catatan aktivitas diperbarui.');
        } else {
          await api.createActivityLog(payload);
          onSaved(`${selectedActivity.name} berhasil dicatat.`);
        }
      } else {
        const cal = parseDecimalInput(manualCalories);
        if (!manualName.trim()) {
          setError('Nama aktivitas wajib diisi.');
          setSubmitting(false);
          return;
        }
        if (!cal || cal <= 0) {
          setError('Kalori terbakar harus lebih dari 0.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          activity_id: null,
          activity_name: manualName.trim(),
          input_value: val,
          input_unit: inputUnit,
          calories_burned: Math.round(cal),
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateActivityLog(editingLog.id, payload);
          onSaved('Catatan aktivitas diperbarui.');
        } else {
          await api.createActivityLog(payload);
          onSaved(`${manualName.trim()} berhasil dicatat.`);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan aktivitas.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableUnits: ActivityUnit[] =
    mode === 'manual' || selectedActivity?.supports_distance ? ['m', 'km', 'menit'] : ['menit'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Aktivitas"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingLog ? 'Edit Catatan Aktivitas' : 'Catat Olahraga & Aktivitas'}
              </h2>
              <p className="text-xs text-slate-500">
                Bisa input jarak (meter/km) atau durasi (menit) — auto-hitung pakai BB {formatNum(currentWeightKg, 1)} kg
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="act-date">
                Tanggal
              </label>
              <input
                id="act-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setMode('catalog')}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'catalog' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Katalog
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'manual' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {mode === 'catalog' ? (
            <>
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari aktivitas... (misal: jalan santai, lari, sepeda, gym)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filteredActivities.map((act) => {
                    const active = selectedActivity?.id === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleSelectActivity(act)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition cursor-pointer ${
                          active ? 'bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {act.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            <span className={`text-sm font-semibold ${active ? 'text-amber-900' : 'text-slate-800'}`}>
                              {act.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {act.category} • MET {act.met}
                            {act.supports_distance ? ' • Bisa m / km / menit' : ' • Satuan menit'}
                          </span>
                        </div>
                        {act.supports_distance && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Jarak / Durasi
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedActivity && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-950">{selectedActivity.name}</span>
                    <span className="text-xs text-amber-800">MET {selectedActivity.met}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="act-value">
                        {inputUnit === 'menit' ? 'Durasi' : 'Jarak'}
                      </label>
                      <input
                        id="act-value"
                        type="text"
                        inputMode="decimal"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={inputUnit === 'm' ? 'Contoh: 500' : inputUnit === 'km' ? 'Contoh: 2,5' : 'Contoh: 30'}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="flex gap-1.5">
                        {availableUnits.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => {
                              setInputUnit(u);
                              if (u === 'm') setInputValue('500');
                              else if (u === 'km') setInputValue('2');
                              else setInputValue('30');
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              inputUnit === u
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {u === 'm' ? 'meter' : u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800">
                          Estimasi Kalori Keluar
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          ~{formatNum(livePreview.durationMinutes, 1)} menit • BB {formatNum(currentWeightKg, 1)} kg
                        </p>
                      </div>
                      <div className="text-right flex items-baseline gap-1 text-amber-700">
                        <Flame className="w-4 h-4 self-center" />
                        <span className="text-2xl font-extrabold tabular-nums">
                          {formatNum(livePreview.caloriesBurned)}
                        </span>
                        <span className="text-xs font-bold">kkal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-name">
                  Nama Aktivitas
                </label>
                <input
                  id="manual-act-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Olahraga Ringan di Rumah"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-cal">
                    Kalori Keluar
                  </label>
                  <input
                    id="manual-act-cal"
                    type="text"
                    inputMode="decimal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="150"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-val">
                    Nilai
                  </label>
                  <input
                    id="manual-act-val"
                    type="text"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-unit">
                    Satuan
                  </label>
                  <select
                    id="manual-act-unit"
                    value={inputUnit}
                    onChange={(e) => setInputUnit(e.target.value as ActivityUnit)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white"
                  >
                    <option value="menit">menit</option>
                    <option value="m">meter</option>
                    <option value="km">km</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="act-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="act-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: jalan kaki sore ke minimarket"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editingLog ? 'Simpan Perubahan' : 'Simpan Aktivitas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== WEIGHT LOG MODAL ==================== */

interface WeightLogModalProps {
  isOpen: boolean;
  date: string;
  initialWeight?: number | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  isOpen,
  date,
  initialWeight,
  onClose,
  onSaved,
}) => {
  const [logDate, setLogDate] = useState(date);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLogDate(date);
    setWeightKg(initialWeight ? String(initialWeight) : '');
    setNotes('');
    setError(null);
  }, [isOpen, date, initialWeight]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseDecimalInput(weightKg);
    if (!val || val < 20 || val > 300) {
      setError('Masukkan berat badan yang valid (20–300 kg).');
      return;
    }

    setSubmitting(true);
    try {
      await api.saveWeightLog({ log_date: logDate, weight_kg: val, notes: notes.trim() });
      onSaved(`Berat badan ${formatNum(val, 1)} kg berhasil dicatat.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan berat badan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Berat Badan"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Catat Berat Badan Harian</h2>
              <p className="text-xs text-slate-500">Jika sudah mencatat di tanggal ini, nilainya akan diperbarui</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-date">
              Tanggal Penimbangan
            </label>
            <input
              id="weight-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-val">
              Berat Badan (kg)
            </label>
            <input
              id="weight-val"
              type="text"
              inputMode="decimal"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Contoh: 69,4"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="weight-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: pagi setelah bangun tidur"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Berat Badan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
=======
import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Flame, Globe, Loader2, Scale, Search, Star, Utensils, X } from 'lucide-react';
import type {
  ActivityItem,
  ActivityLog,
  ActivityUnit,
  FoodItem,
  FoodLog,
  MealType,
  OpenFoodFactsProduct,
} from '../types';
import { api } from '../api/client';
import {
  MEAL_LABELS,
  formatNum,
  parseDecimalInput,
  previewActivityCalories,
  previewFoodNutrition,
} from '../utils/calculators';

/* ==================== FOOD LOG MODAL ==================== */

interface FoodLogModalProps {
  isOpen: boolean;
  date: string;
  initialMealType?: MealType;
  editingLog?: FoodLog | null;
  foods: FoodItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onFoodCreated: (food: FoodItem) => void;
}

export const FoodLogModal: React.FC<FoodLogModalProps> = ({
  isOpen,
  date,
  initialMealType = 'siang',
  editingLog,
  foods,
  onClose,
  onSaved,
  onFoodCreated,
}) => {
  const [mode, setMode] = useState<'catalog' | 'online' | 'manual'>('catalog');
  const [logDate, setLogDate] = useState(date);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitMode, setUnitMode] = useState<'default' | 'gram'>('default');

  // Open Food Facts online search state
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<OpenFoodFactsProduct[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineSearched, setOnlineSearched] = useState(false);
  const [selectedOnline, setSelectedOnline] = useState<OpenFoodFactsProduct | null>(null);
  const [saveOnlineToCatalog, setSaveOnlineToCatalog] = useState(true);

  // Manual fields
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualUnit, setManualUnit] = useState('porsi');
  const [manualGrams, setManualGrams] = useState('150');
  const [manualCategory, setManualCategory] = useState('Masakan Jadi');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch('');
    setSaveToCatalog(false);
    setOnlineQuery('');
    setOnlineResults([]);
    setOnlineSearched(false);
    setSelectedOnline(null);
    setSaveOnlineToCatalog(true);

    if (editingLog) {
      setLogDate(editingLog.log_date);
      setMealType(editingLog.meal_type);
      setQuantity(String(editingLog.quantity));
      setNotes(editingLog.notes || '');
      const matched = editingLog.food_id ? foods.find((f) => f.id === editingLog.food_id) || null : null;
      if (matched) {
        setMode('catalog');
        setSelectedFood(matched);
        setUnitMode(editingLog.unit.toLowerCase() === 'gram' ? 'gram' : 'default');
      } else {
        setMode('manual');
        setSelectedFood(null);
        setManualName(editingLog.food_name);
        setManualCalories(String(editingLog.calories));
        setManualUnit(editingLog.unit);
      }
    } else {
      setLogDate(date);
      setMealType(initialMealType);
      setMode('catalog');
      setSelectedFood(null);
      setQuantity('1');
      setUnitMode('default');
      setManualName('');
      setManualCalories('');
      setManualUnit('porsi');
      setManualGrams('150');
      setNotes('');
    }
  }, [isOpen, date, initialMealType, editingLog, foods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? foods.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
      : foods;
    return list.slice(0, 30);
  }, [foods, search]);

  const activeFoodForPreview: FoodItem | null = useMemo(() => {
    if (mode === 'catalog') return selectedFood;
    if (mode === 'online' && selectedOnline) {
      return {
        id: 0,
        name: selectedOnline.name,
        category: 'Masakan Jadi',
        default_unit: selectedOnline.default_unit,
        serving_grams: selectedOnline.serving_grams,
        calories_per_100g: selectedOnline.calories_per_100g,
        protein_per_100g: selectedOnline.protein_per_100g,
        carbs_per_100g: selectedOnline.carbs_per_100g,
        fat_per_100g: selectedOnline.fat_per_100g,
        is_custom: true,
        is_favorite: false,
      };
    }
    return null;
  }, [mode, selectedFood, selectedOnline]);

  const activeUnit = activeFoodForPreview
    ? unitMode === 'gram'
      ? 'gram'
      : activeFoodForPreview.default_unit
    : 'porsi';
  const livePreview = useMemo(() => {
    if (!activeFoodForPreview) return null;
    const qty = parseDecimalInput(quantity);
    if (!qty || qty <= 0) return null;
    return previewFoodNutrition(activeFoodForPreview, qty, activeUnit);
  }, [activeFoodForPreview, quantity, activeUnit]);

  if (!isOpen) return null;

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setUnitMode('default');
    setQuantity('1');
    setError(null);
  };

  const handleSearchOnline = async () => {
    const q = onlineQuery.trim();
    if (q.length < 2) {
      setError('Ketik minimal 2 huruf nama produk (misal: Indomie, Ultra Milk, Milo).');
      return;
    }
    setError(null);
    setOnlineLoading(true);
    setOnlineSearched(true);
    setSelectedOnline(null);
    try {
      const items = await api.searchOpenFoodFacts(q);
      setOnlineResults(items);
    } catch (err) {
      setOnlineResults([]);
      setError(err instanceof Error ? err.message : 'Gagal mencari di Open Food Facts.');
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleSelectOnline = (item: OpenFoodFactsProduct) => {
    setSelectedOnline(item);
    setUnitMode('default');
    setQuantity('1');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const qty = parseDecimalInput(quantity);
    if (!qty || qty <= 0) {
      setError('Jumlah porsi harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        if (!selectedFood) {
          setError('Pilih makanan dari daftar terlebih dahulu, atau gunakan tab Cari Online / Manual.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          meal_type: mealType,
          food_id: selectedFood.id,
          quantity: qty,
          unit: activeUnit,
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${selectedFood.name} berhasil dicatat.`);
        }
      } else if (mode === 'online') {
        if (!selectedOnline || !livePreview) {
          setError('Cari dan pilih produk Open Food Facts terlebih dahulu.');
          setSubmitting(false);
          return;
        }

        let createdFoodId: number | null = null;
        if (saveOnlineToCatalog) {
          const newFood = await api.createFood({
            name: selectedOnline.name,
            category: 'Camilan',
            default_unit: selectedOnline.default_unit,
            serving_grams: selectedOnline.serving_grams,
            calories_per_100g: selectedOnline.calories_per_100g,
            protein_per_100g: selectedOnline.protein_per_100g,
            carbs_per_100g: selectedOnline.carbs_per_100g,
            fat_per_100g: selectedOnline.fat_per_100g,
          });
          createdFoodId = newFood.id;
          onFoodCreated(newFood);
        }

        const payload = createdFoodId
          ? {
              log_date: logDate,
              meal_type: mealType,
              food_id: createdFoodId,
              quantity: qty,
              unit: activeUnit,
              notes: notes.trim(),
            }
          : {
              log_date: logDate,
              meal_type: mealType,
              food_id: null,
              food_name: selectedOnline.name,
              quantity: qty,
              unit: activeUnit,
              calories: livePreview.calories,
              protein: livePreview.protein,
              carbs: livePreview.carbs,
              fat: livePreview.fat,
              notes: notes.trim(),
            };

        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${selectedOnline.name} berhasil dicatat.`);
        }
      } else {
        const cal = parseDecimalInput(manualCalories);
        if (!manualName.trim()) {
          setError('Nama makanan wajib diisi.');
          setSubmitting(false);
          return;
        }
        if (cal === null || cal < 0) {
          setError('Masukkan estimasi kalori yang valid (0 atau lebih).');
          setSubmitting(false);
          return;
        }

        let createdFoodId: number | null = null;
        if (saveToCatalog && !editingLog) {
          const grams = parseDecimalInput(manualGrams) || 100;
          const calPer100 = Math.round(((cal / qty) / grams) * 100 * 10) / 10;
          const newFood = await api.createFood({
            name: manualName.trim(),
            category: manualCategory,
            default_unit: manualUnit.trim() || 'porsi',
            serving_grams: grams,
            calories_per_100g: calPer100,
          });
          createdFoodId = newFood.id;
          onFoodCreated(newFood);
        }

        const payload = createdFoodId
          ? {
              log_date: logDate,
              meal_type: mealType,
              food_id: createdFoodId,
              quantity: qty,
              unit: manualUnit.trim() || 'porsi',
              notes: notes.trim(),
            }
          : {
              log_date: logDate,
              meal_type: mealType,
              food_id: null,
              food_name: manualName.trim(),
              quantity: qty,
              unit: manualUnit.trim() || 'porsi',
              calories: Math.round(cal),
              notes: notes.trim(),
            };

        if (editingLog) {
          await api.updateFoodLog(editingLog.id, payload);
          onSaved('Catatan makanan diperbarui.');
        } else {
          await api.createFoodLog(payload);
          onSaved(`${manualName.trim()} berhasil dicatat.`);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan catatan makanan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Makanan"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingLog ? 'Edit Catatan Makanan' : 'Catat Makanan & Minuman'}
              </h2>
              <p className="text-xs text-slate-500">Kalori otomatis dihitung dari porsi yang Anda pilih</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Date & Meal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-date">
                Tanggal
              </label>
              <input
                id="food-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-meal">
                Waktu Makan
              </label>
              <select
                id="food-meal"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(Object.keys(MEAL_LABELS) as MealType[]).map((m) => (
                  <option key={m} value={m}>
                    {MEAL_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setMode('catalog')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'catalog' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Katalog ({foods.length})
            </button>
            <button
              type="button"
              onClick={() => setMode('online')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1 ${
                mode === 'online' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Cari Online
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'manual' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Manual
            </button>
          </div>

          {mode === 'catalog' ? (
            <>
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari makanan... (misal: nasi goreng, ayam, kopi)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filteredFoods.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Makanan tidak ditemukan. Gunakan tab <strong>Input Manual / Baru</strong> untuk menambahkannya.
                    </div>
                  ) : (
                    filteredFoods.map((f) => {
                      const active = selectedFood?.id === f.id;
                      const perServing = Math.round((f.serving_grams / 100) * f.calories_per_100g);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleSelectFood(f)}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition cursor-pointer ${
                            active ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              {f.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                              <span className={`text-sm font-semibold truncate ${active ? 'text-emerald-800' : 'text-slate-800'}`}>
                                {f.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {f.category} • 1 {f.default_unit} ({f.serving_grams} g)
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-1 rounded-lg shrink-0 tabular-nums">
                            {perServing} kkal
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedFood && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-950">{selectedFood.name}</span>
                    <span className="text-xs text-emerald-700">{selectedFood.calories_per_100g} kkal / 100 g</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="food-qty">
                        Jumlah
                      </label>
                      <input
                        id="food-qty"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Contoh: 1 atau 1,5"
                        className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('default');
                            setQuantity('1');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer truncate ${
                            unitMode === 'default'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedFood.default_unit}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('gram');
                            setQuantity(String(selectedFood.serving_grams));
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            unitMode === 'gram'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          gram
                        </button>
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-700">
                          Estimasi Otomatis
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          P {formatNum(livePreview.protein, 1)}g • K {formatNum(livePreview.carbs, 1)}g • L {formatNum(livePreview.fat, 1)}g
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">
                          {formatNum(livePreview.calories)}
                        </span>{' '}
                        <span className="text-xs font-bold text-emerald-700">kkal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : mode === 'online' ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="w-4 h-4 text-sky-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchOnline();
                      }
                    }}
                    placeholder="Cari produk kemasan... (misal: Indomie, Ultra Milk, Milo)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchOnline}
                  disabled={onlineLoading}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  {onlineLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Sumber data: <strong>Open Food Facts</strong> (detail kalori &amp; makro produk kemasan secara real-time).
              </p>

              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                {onlineLoading ? (
                  <div className="p-5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> Mengambil data dari Open Food Facts...
                  </div>
                ) : !onlineSearched ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Ketik nama produk kemasan lalu klik <strong>Cari</strong>.
                  </div>
                ) : onlineResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Produk dengan data kalori tidak ditemukan. Coba kata kunci lain atau pakai tab Manual.
                  </div>
                ) : (
                  onlineResults.map((item, idx) => {
                    const active = selectedOnline?.code === item.code && selectedOnline?.name === item.name;
                    return (
                      <button
                        key={`${item.code}-${idx}`}
                        type="button"
                        onClick={() => handleSelectOnline(item)}
                        className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-2.5 transition cursor-pointer ${
                          active ? 'bg-sky-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                              <Globe className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${active ? 'text-sky-900' : 'text-slate-800'}`}>
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              {item.calories_per_100g} kkal/100g • P {item.protein_per_100g}g • K {item.carbs_per_100g}g • L {item.fat_per_100g}g
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-sky-700 bg-sky-100/80 px-2 py-1 rounded-lg shrink-0 tabular-nums">
                          {item.calories_per_serving} kkal
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedOnline && (
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-sky-950 truncate">{selectedOnline.name}</span>
                    <span className="text-xs text-sky-700 shrink-0 tabular-nums">
                      {selectedOnline.calories_per_100g} kkal / 100 g
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="online-food-qty">
                        Jumlah
                      </label>
                      <input
                        id="online-food-qty"
                        type="text"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('default');
                            setQuantity('1');
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer truncate ${
                            unitMode === 'default'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {selectedOnline.default_unit}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUnitMode('gram');
                            setQuantity(String(selectedOnline.serving_grams));
                          }}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                            unitMode === 'gram'
                              ? 'bg-sky-600 text-white border-sky-600'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          gram
                        </button>
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-sky-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-sky-700">
                          Estimasi Otomatis
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          P {formatNum(livePreview.protein, 1)}g • K {formatNum(livePreview.carbs, 1)}g • L {formatNum(livePreview.fat, 1)}g
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-sky-700 tabular-nums">
                          {formatNum(livePreview.calories)}
                        </span>{' '}
                        <span className="text-xs font-bold text-sky-700">kkal</span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveOnlineToCatalog}
                      onChange={(e) => setSaveOnlineToCatalog(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600"
                    />
                    Simpan juga ke katalog pribadi agar bisa dipakai offline lain kali
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-name">
                  Nama Makanan / Minuman
                </label>
                <input
                  id="manual-food-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Nasi Campur Bu Ani"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-cal">
                    Total Kalori (kkal)
                  </label>
                  <input
                    id="manual-food-cal"
                    type="text"
                    inputMode="decimal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="350"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-qty">
                    Jumlah
                  </label>
                  <input
                    id="manual-food-qty"
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-food-unit">
                    Satuan
                  </label>
                  <input
                    id="manual-food-unit"
                    type="text"
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {!editingLog && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToCatalog}
                      onChange={(e) => setSaveToCatalog(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    Simpan ke katalog pribadi agar bisa auto-hitung lain kali
                  </label>
                  {saveToCatalog && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <select
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white"
                      >
                        {['Makanan Pokok', 'Lauk', 'Sayur', 'Masakan Jadi', 'Buah', 'Minuman', 'Camilan'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualGrams}
                        onChange={(e) => setManualGrams(e.target.value)}
                        placeholder="Gram per 1 porsi (mis. 150)"
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs tabular-nums"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="food-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="food-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: tanpa sambal, sedikit minyak"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editingLog ? 'Simpan Perubahan' : 'Simpan Makanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== ACTIVITY LOG MODAL ==================== */

interface ActivityLogModalProps {
  isOpen: boolean;
  date: string;
  currentWeightKg: number;
  editingLog?: ActivityLog | null;
  activities: ActivityItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  date,
  currentWeightKg,
  editingLog,
  activities,
  onClose,
  onSaved,
}) => {
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog');
  const [logDate, setLogDate] = useState(date);
  const [search, setSearch] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [inputValue, setInputValue] = useState('30');
  const [inputUnit, setInputUnit] = useState<ActivityUnit>('menit');
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSearch('');
    if (editingLog) {
      setLogDate(editingLog.log_date);
      setInputValue(String(editingLog.input_value));
      setInputUnit(editingLog.input_unit);
      setNotes(editingLog.notes || '');
      const matched = editingLog.activity_id ? activities.find((a) => a.id === editingLog.activity_id) || null : null;
      if (matched) {
        setMode('catalog');
        setSelectedActivity(matched);
      } else {
        setMode('manual');
        setSelectedActivity(null);
        setManualName(editingLog.activity_name);
        setManualCalories(String(editingLog.calories_burned));
      }
    } else {
      setLogDate(date);
      setMode('catalog');
      setSelectedActivity(null);
      setInputValue('30');
      setInputUnit('menit');
      setManualName('');
      setManualCalories('');
      setNotes('');
    }
  }, [isOpen, date, editingLog, activities]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? activities.filter((a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q))
      : activities;
  }, [activities, search]);

  const livePreview = useMemo(() => {
    if (mode !== 'catalog' || !selectedActivity) return null;
    const val = parseDecimalInput(inputValue);
    if (!val || val <= 0) return null;
    return previewActivityCalories(selectedActivity, val, inputUnit, currentWeightKg);
  }, [mode, selectedActivity, inputValue, inputUnit, currentWeightKg]);

  if (!isOpen) return null;

  const handleSelectActivity = (act: ActivityItem) => {
    setSelectedActivity(act);
    setError(null);
    if (act.supports_distance) {
      // Keep current unit if valid; default nicely to 'm' for walking/running if coming from empty
      if (inputUnit === 'menit') {
        setInputUnit('m');
        setInputValue('500');
      }
    } else {
      setInputUnit('menit');
      if (inputUnit !== 'menit') setInputValue('30');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseDecimalInput(inputValue);
    if (!val || val <= 0) {
      setError('Nilai jarak atau durasi harus lebih dari 0.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'catalog') {
        if (!selectedActivity) {
          setError('Pilih aktivitas terlebih dahulu.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          activity_id: selectedActivity.id,
          input_value: val,
          input_unit: inputUnit,
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateActivityLog(editingLog.id, payload);
          onSaved('Catatan aktivitas diperbarui.');
        } else {
          await api.createActivityLog(payload);
          onSaved(`${selectedActivity.name} berhasil dicatat.`);
        }
      } else {
        const cal = parseDecimalInput(manualCalories);
        if (!manualName.trim()) {
          setError('Nama aktivitas wajib diisi.');
          setSubmitting(false);
          return;
        }
        if (!cal || cal <= 0) {
          setError('Kalori terbakar harus lebih dari 0.');
          setSubmitting(false);
          return;
        }
        const payload = {
          log_date: logDate,
          activity_id: null,
          activity_name: manualName.trim(),
          input_value: val,
          input_unit: inputUnit,
          calories_burned: Math.round(cal),
          notes: notes.trim(),
        };
        if (editingLog) {
          await api.updateActivityLog(editingLog.id, payload);
          onSaved('Catatan aktivitas diperbarui.');
        } else {
          await api.createActivityLog(payload);
          onSaved(`${manualName.trim()} berhasil dicatat.`);
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan aktivitas.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableUnits: ActivityUnit[] =
    mode === 'manual' || selectedActivity?.supports_distance ? ['m', 'km', 'menit'] : ['menit'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Aktivitas"
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingLog ? 'Edit Catatan Aktivitas' : 'Catat Olahraga & Aktivitas'}
              </h2>
              <p className="text-xs text-slate-500">
                Bisa input jarak (meter/km) atau durasi (menit) — auto-hitung pakai BB {formatNum(currentWeightKg, 1)} kg
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="act-date">
                Tanggal
              </label>
              <input
                id="act-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setMode('catalog')}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'catalog' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Katalog
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  mode === 'manual' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {mode === 'catalog' ? (
            <>
              <div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari aktivitas... (misal: jalan santai, lari, sepeda, gym)"
                    className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {filteredActivities.map((act) => {
                    const active = selectedActivity?.id === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handleSelectActivity(act)}
                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between transition cursor-pointer ${
                          active ? 'bg-amber-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {act.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            <span className={`text-sm font-semibold ${active ? 'text-amber-900' : 'text-slate-800'}`}>
                              {act.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {act.category} • MET {act.met}
                            {act.supports_distance ? ' • Bisa m / km / menit' : ' • Satuan menit'}
                          </span>
                        </div>
                        {act.supports_distance && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Jarak / Durasi
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedActivity && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-950">{selectedActivity.name}</span>
                    <span className="text-xs text-amber-800">MET {selectedActivity.met}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="act-value">
                        {inputUnit === 'menit' ? 'Durasi' : 'Jarak'}
                      </label>
                      <input
                        id="act-value"
                        type="text"
                        inputMode="decimal"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={inputUnit === 'm' ? 'Contoh: 500' : inputUnit === 'km' ? 'Contoh: 2,5' : 'Contoh: 30'}
                        className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-slate-700 mb-1">Satuan</span>
                      <div className="flex gap-1.5">
                        {availableUnits.map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => {
                              setInputUnit(u);
                              if (u === 'm') setInputValue('500');
                              else if (u === 'km') setInputValue('2');
                              else setInputValue('30');
                            }}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              inputUnit === u
                                ? 'bg-amber-500 text-white border-amber-500'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {u === 'm' ? 'meter' : u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {livePreview && (
                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/70">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800">
                          Estimasi Kalori Keluar
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          ~{formatNum(livePreview.durationMinutes, 1)} menit • BB {formatNum(currentWeightKg, 1)} kg
                        </p>
                      </div>
                      <div className="text-right flex items-baseline gap-1 text-amber-700">
                        <Flame className="w-4 h-4 self-center" />
                        <span className="text-2xl font-extrabold tabular-nums">
                          {formatNum(livePreview.caloriesBurned)}
                        </span>
                        <span className="text-xs font-bold">kkal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-name">
                  Nama Aktivitas
                </label>
                <input
                  id="manual-act-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Contoh: Olahraga Ringan di Rumah"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-cal">
                    Kalori Keluar
                  </label>
                  <input
                    id="manual-act-cal"
                    type="text"
                    inputMode="decimal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="150"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-val">
                    Nilai
                  </label>
                  <input
                    id="manual-act-val"
                    type="text"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="manual-act-unit">
                    Satuan
                  </label>
                  <select
                    id="manual-act-unit"
                    value={inputUnit}
                    onChange={(e) => setInputUnit(e.target.value as ActivityUnit)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-sm bg-white"
                  >
                    <option value="menit">menit</option>
                    <option value="m">meter</option>
                    <option value="km">km</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="act-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="act-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: jalan kaki sore ke minimarket"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : editingLog ? 'Simpan Perubahan' : 'Simpan Aktivitas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== WEIGHT LOG MODAL ==================== */

interface WeightLogModalProps {
  isOpen: boolean;
  date: string;
  initialWeight?: number | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  isOpen,
  date,
  initialWeight,
  onClose,
  onSaved,
}) => {
  const [logDate, setLogDate] = useState(date);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLogDate(date);
    setWeightKg(initialWeight ? String(initialWeight) : '');
    setNotes('');
    setError(null);
  }, [isOpen, date, initialWeight]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const val = parseDecimalInput(weightKg);
    if (!val || val < 20 || val > 300) {
      setError('Masukkan berat badan yang valid (20–300 kg).');
      return;
    }

    setSubmitting(true);
    try {
      await api.saveWeightLog({ log_date: logDate, weight_kg: val, notes: notes.trim() });
      onSaved(`Berat badan ${formatNum(val, 1)} kg berhasil dicatat.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan berat badan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Berat Badan"
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Catat Berat Badan Harian</h2>
              <p className="text-xs text-slate-500">Jika sudah mencatat di tanggal ini, nilainya akan diperbarui</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-date">
              Tanggal Penimbangan
            </label>
            <input
              id="weight-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-val">
              Berat Badan (kg)
            </label>
            <input
              id="weight-val"
              type="text"
              inputMode="decimal"
              required
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Contoh: 69,4"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="weight-notes">
              Catatan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <input
              id="weight-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: pagi setelah bangun tidur"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Berat Badan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
