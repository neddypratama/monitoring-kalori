import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Camera,
  Flame,
  ImagePlus,
  Loader2,
  Scale,
  Search,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import type {
  ActivityItem,
  ActivityLog,
  ActivityUnit,
  FoodItem,
  FoodLog,
  MealType,
  PhotoAnalysisResult,
} from '../types';
import { api } from '../api/client';
import {
  MEAL_LABELS,
  formatNum,
  parseDecimalInput,
  previewActivityCalories,
  previewFoodNutrition,
} from '../utils/calculators';
import { compressFoodImage } from '../utils/imageCompress';

interface EditablePhotoItem {
  selected: boolean;
  name: string;
  unit: string;
  quantity: string;
  calories: string;
  protein: number;
  carbs: number;
  fat: number;
}

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
  const [mode, setMode] = useState<'catalog' | 'photo' | 'manual'>('catalog');
  const [logDate, setLogDate] = useState(date);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [search, setSearch] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitMode, setUnitMode] = useState<'default' | 'gram'>('default');

  // Photo AI (Gemini Vision) state
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoResult, setPhotoResult] = useState<PhotoAnalysisResult | null>(null);
  const [photoItems, setPhotoItems] = useState<EditablePhotoItem[]>([]);

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
    setPhotoBase64(null);
    setPhotoMimeType('image/jpeg');
    setPhotoPreviewUrl(null);
    setPhotoHint('');
    setPhotoLoading(false);
    setPhotoResult(null);
    setPhotoItems([]);

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

  const activeUnit = selectedFood ? (unitMode === 'gram' ? 'gram' : selectedFood.default_unit) : 'porsi';
  const livePreview = useMemo(() => {
    if (mode !== 'catalog' || !selectedFood) return null;
    const qty = parseDecimalInput(quantity);
    if (!qty || qty <= 0) return null;
    return previewFoodNutrition(selectedFood, qty, activeUnit);
  }, [mode, selectedFood, quantity, activeUnit]);

  const selectedPhotoTotals = useMemo(() => {
    const checked = photoItems.filter((item) => item.selected);
    const totalCalories = checked.reduce((sum, item) => sum + Math.max(0, Math.round(parseDecimalInput(item.calories) ?? 0)), 0);
    const totalProtein = checked.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = checked.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = checked.reduce((sum, item) => sum + item.fat, 0);
    return { count: checked.length, totalCalories, totalProtein, totalCarbs, totalFat };
  }, [photoItems]);

  if (!isOpen) return null;

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setUnitMode('default');
    setQuantity('1');
    setError(null);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }
    setError(null);
    setPhotoResult(null);
    setPhotoItems([]);
    try {
      const compressed = await compressFoodImage(file, 1024, 0.82);
      setPhotoBase64(compressed.base64);
      setPhotoMimeType(compressed.mimeType);
      setPhotoPreviewUrl(compressed.previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    }
  };

  const handleAnalyzePhoto = async () => {
    if (!photoBase64) {
      setError('Ambil atau upload foto makanan terlebih dahulu.');
      return;
    }
    setError(null);
    setPhotoLoading(true);
    try {
      const res = await api.analyzeFoodPhoto({
        image_base64: photoBase64,
        mime_type: photoMimeType,
        hint: photoHint.trim() || undefined,
      });
      setPhotoResult(res);
      setPhotoItems(
        res.items.map((item) => ({
          selected: true,
          name: item.name,
          unit: item.unit || 'porsi',
          quantity: String(item.quantity || 1),
          calories: String(Math.round(item.calories)),
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menganalisis foto makanan.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const updatePhotoItem = (idx: number, patch: Partial<EditablePhotoItem>) => {
    setPhotoItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleClearPhoto = () => {
    setPhotoBase64(null);
    setPhotoPreviewUrl(null);
    setPhotoResult(null);
    setPhotoItems([]);
    setPhotoHint('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      if (mode === 'photo') {
        const chosen = photoItems.filter((item) => item.selected);
        if (chosen.length === 0) {
          setError('Pilih minimal 1 makanan hasil analisis foto untuk disimpan.');
          setSubmitting(false);
          return;
        }
        for (const item of chosen) {
          const cal = parseDecimalInput(item.calories);
          const qtyVal = parseDecimalInput(item.quantity);
          if (!item.name.trim() || cal === null || cal < 0 || !qtyVal || qtyVal <= 0) {
            setError('Pastikan nama, porsi (> 0), dan kalori tiap item yang dipilih valid.');
            setSubmitting(false);
            return;
          }
        }
        for (const item of chosen) {
          const cal = Math.round(parseDecimalInput(item.calories) ?? 0);
          const qtyVal = parseDecimalInput(item.quantity) ?? 1;
          await api.createFoodLog({
            log_date: logDate,
            meal_type: mealType,
            food_id: null,
            food_name: item.name.trim(),
            quantity: qtyVal,
            unit: item.unit.trim() || 'porsi',
            calories: cal,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            notes: notes.trim() || (photoResult?.meal_summary ? `Foto AI: ${photoResult.meal_summary}` : 'Foto AI'),
          });
        }
        onSaved(
          chosen.length === 1
            ? `${chosen[0].name.trim()} berhasil dicatat dari Foto AI.`
            : `${chosen.length} makanan berhasil dicatat dari Foto AI.`
        );
        onClose();
        return;
      }

      const qty = parseDecimalInput(quantity);
      if (!qty || qty <= 0) {
        setError('Jumlah porsi harus lebih dari 0.');
        setSubmitting(false);
        return;
      }

      if (mode === 'catalog') {
        if (!selectedFood) {
          setError('Pilih makanan dari daftar terlebih dahulu, atau gunakan tab Foto AI / Manual.');
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Makanan"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {editingLog ? 'Edit Catatan Makanan' : 'Catat Makanan & Minuman'}
              </h2>
              <p className="text-xs text-slate-500 truncate">Pilih katalog, foto AI, atau input manual</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
                onClick={() => {
                  setMode('catalog');
                  setError(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mode === 'catalog' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Katalog ({foods.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('photo');
                  setError(null);
                }}
                className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1 ${
                  mode === 'photo' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Camera className="w-3.5 h-3.5" /> Foto AI
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('manual');
                  setError(null);
                }}
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
                        Makanan tidak ditemukan. Gunakan tab <strong>Foto AI</strong> atau <strong>Manual</strong>.
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
            ) : mode === 'photo' ? (
              <div className="space-y-3.5">
                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="Ambil Foto Kamera"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Upload Foto Makanan"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                {!photoPreviewUrl ? (
                  <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Hitung Kalori dari Foto Makanan</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ambil foto piring makanan atau unggah dari galeri, lalu AI akan mengestimasi tiap lauk &amp; kalorinya.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4" /> Ambil Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-violet-700 border border-violet-200 text-xs font-bold cursor-pointer"
                      >
                        <ImagePlus className="w-4 h-4" /> Upload Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950/5">
                      <img
                        src={photoPreviewUrl}
                        alt="Pratinjau foto makanan"
                        className="w-full max-h-52 object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Ganti Foto
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={photoHint}
                        onChange={(e) => setPhotoHint(e.target.value)}
                        placeholder="Keterangan opsional (mis: nasi setengah porsi, tanpa sambal)"
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleAnalyzePhoto}
                        disabled={photoLoading}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer shrink-0"
                      >
                        {photoLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Analisis Foto AI
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {photoResult && (
                  <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200/80 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-violet-950">{photoResult.meal_summary}</p>
                        {photoResult.notes && <p className="text-[11px] text-slate-600 mt-0.5">{photoResult.notes}</p>}
                        {photoResult.provider_used && (
                          <p className="text-[10px] text-violet-600 font-semibold mt-1">
                            Dianalisis oleh {photoResult.provider_used.toUpperCase()}
                            {photoResult.model_used ? ` • ${photoResult.model_used.split('/').pop()}` : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          photoResult.confidence === 'tinggi'
                            ? 'bg-emerald-100 text-emerald-800'
                            : photoResult.confidence === 'sedang'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Akurasi: {photoResult.confidence}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {photoItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition space-y-2 ${
                            item.selected ? 'bg-white border-violet-200' : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => updatePhotoItem(idx, { selected: e.target.checked })}
                              className="rounded border-slate-300 text-violet-600 cursor-pointer"
                              aria-label={`Pilih ${item.name}`}
                            />
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updatePhotoItem(idx, { name: e.target.value })}
                              className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-900"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 pl-6">
                            <div>
                              <span className="block text-[10px] font-semibold text-slate-500">Kalori (kkal)</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.calories}
                                onChange={(e) => updatePhotoItem(idx, { calories: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-violet-700 tabular-nums"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-slate-500">Jumlah</span>
                              <input
                                type="text"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => updatePhotoItem(idx, { quantity: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs tabular-nums"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-slate-500">Satuan</span>
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updatePhotoItem(idx, { unit: e.target.value })}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 pl-6 tabular-nums">
                            P {formatNum(item.protein, 1)}g • K {formatNum(item.carbs, 1)}g • L {formatNum(item.fat, 1)}g
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-violet-200/80">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-violet-700">
                          Total Terpilih ({selectedPhotoTotals.count} item)
                        </span>
                        <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                          P {formatNum(selectedPhotoTotals.totalProtein, 1)}g • K {formatNum(selectedPhotoTotals.totalCarbs, 1)}g • L {formatNum(selectedPhotoTotals.totalFat, 1)}g
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-violet-700 tabular-nums">
                          {formatNum(selectedPhotoTotals.totalCalories)}
                        </span>{' '}
                        <span className="text-xs font-bold text-violet-700">kkal</span>
                      </div>
                    </div>
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
          </div>

          <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white flex justify-end gap-2 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || (mode === 'photo' && selectedPhotoTotals.count === 0)}
              className={`px-5 py-2.5 rounded-xl disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer ${
                mode === 'photo' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting
                ? 'Menyimpan...'
                : editingLog
                  ? 'Simpan Perubahan'
                  : mode === 'photo'
                    ? `Simpan ${selectedPhotoTotals.count > 0 ? `(${selectedPhotoTotals.count}) ` : ''}dari Foto`
                    : 'Simpan Makanan'}
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Aktivitas"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">
                {editingLog ? 'Edit Catatan Aktivitas' : 'Catat Olahraga & Aktivitas'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Jarak (m/km) atau durasi (menit) • BB {formatNum(currentWeightKg, 1)} kg
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
          </div>

          <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white flex justify-end gap-2 pb-safe">
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Catat Berat Badan"
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 truncate">Catat Berat Badan Harian</h2>
              <p className="text-xs text-slate-500 truncate">Jika sudah mencatat di tanggal ini, nilainya akan diperbarui</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
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
          </div>

          <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-white flex justify-end gap-2 pb-safe">
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
