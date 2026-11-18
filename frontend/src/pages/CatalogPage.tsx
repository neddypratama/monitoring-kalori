import React, { useMemo, useState } from 'react';
import { Activity, Edit3, Loader2, Plus, Search, Star, Trash2, Utensils, X } from 'lucide-react';
import type { ActivityItem, FoodItem } from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from '../components/FormStatusBanner';
import { formatNum, parseDecimalInput } from '../utils/calculators';

interface CatalogPageProps {
  foods: FoodItem[];
  activities: ActivityItem[];
  onRefreshCatalog: () => Promise<void>;
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const FOOD_CATEGORIES = ['Semua', 'Makanan Pokok', 'Lauk', 'Sayur', 'Masakan Jadi', 'Buah', 'Minuman', 'Camilan'];
const ACT_CATEGORIES = ['Semua', 'Jalan & Lari', 'Kardio', 'Kekuatan', 'Olahraga Permainan', 'Aktivitas Harian'];

export const CatalogPage: React.FC<CatalogPageProps> = ({
  foods,
  activities,
  onRefreshCatalog,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'foods' | 'activities'>('foods');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [favOnly, setFavOnly] = useState(false);

  // Add/Edit food form state
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [fName, setFName] = useState('');
  const [fCategory, setFCategory] = useState('Masakan Jadi');
  const [fUnit, setFUnit] = useState('porsi');
  const [fGrams, setFGrams] = useState('150');
  const [fCal, setFCal] = useState('');
  const [fPro, setFPro] = useState('0');
  const [fCarb, setFCarb] = useState('0');
  const [fFat, setFFat] = useState('0');

  // Add/Edit activity form state
  const [showActForm, setShowActForm] = useState(false);
  const [editingAct, setEditingAct] = useState<ActivityItem | null>(null);
  const [aName, setAName] = useState('');
  const [aCategory, setACategory] = useState('Kardio');
  const [aMet, setAMet] = useState('5');
  const [aDist, setADist] = useState(false);
  const [aSpeed, setASpeed] = useState('5');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((f) => {
      if (favOnly && !f.is_favorite) return false;
      if (category !== 'Semua' && f.category !== category) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [foods, search, category, favOnly]);

  const filteredActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((a) => {
      if (favOnly && !a.is_favorite) return false;
      if (category !== 'Semua' && a.category !== category) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activities, search, category, favOnly]);

  const openNewFood = () => {
    setEditingFood(null);
    setFName('');
    setFCategory('Masakan Jadi');
    setFUnit('porsi');
    setFGrams('150');
    setFCal('');
    setFPro('0');
    setFCarb('0');
    setFFat('0');
    setFormError(null);
    setShowFoodForm(true);
  };

  const openEditFood = (f: FoodItem) => {
    setEditingFood(f);
    setFName(f.name);
    setFCategory(f.category);
    setFUnit(f.default_unit);
    setFGrams(String(f.serving_grams));
    setFCal(String(f.calories_per_100g));
    setFPro(String(f.protein_per_100g));
    setFCarb(String(f.carbs_per_100g));
    setFFat(String(f.fat_per_100g));
    setFormError(null);
    setShowFoodForm(true);
  };

  const openNewAct = () => {
    setEditingAct(null);
    setAName('');
    setACategory('Kardio');
    setAMet('5');
    setADist(false);
    setASpeed('5');
    setFormError(null);
    setShowActForm(true);
  };

  const openEditAct = (a: ActivityItem) => {
    setEditingAct(a);
    setAName(a.name);
    setACategory(a.category);
    setAMet(String(a.met));
    setADist(a.supports_distance);
    setASpeed(a.default_speed_kmh ? String(a.default_speed_kmh) : '5');
    setFormError(null);
    setShowActForm(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const grams = parseDecimalInput(fGrams);
    const cal = parseDecimalInput(fCal);
    if (!fName.trim() || !grams || grams <= 0 || cal === null || cal < 0) {
      const msg = 'Lengkapi nama, gram per porsi (> 0), dan kalori per 100g.';
      setFormError(msg);
      onNotify('error', msg);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: fName.trim(),
        category: fCategory,
        default_unit: fUnit.trim() || 'porsi',
        serving_grams: grams,
        calories_per_100g: cal,
        protein_per_100g: parseDecimalInput(fPro) ?? 0,
        carbs_per_100g: parseDecimalInput(fCarb) ?? 0,
        fat_per_100g: parseDecimalInput(fFat) ?? 0,
      };
      if (editingFood) {
        await api.updateFood(editingFood.id, payload);
        onNotify('success', 'Makanan kustom diperbarui.');
      } else {
        await api.createFood(payload);
        onNotify('success', 'Makanan kustom ditambahkan ke katalog.');
      }
      setShowFoodForm(false);
      await onRefreshCatalog();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan makanan.';
      setFormError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const met = parseDecimalInput(aMet);
    const speed = aDist ? parseDecimalInput(aSpeed) : null;
    if (!aName.trim() || !met || met <= 0) {
      const msg = 'Nama aktivitas dan nilai MET (> 0) wajib diisi.';
      setFormError(msg);
      onNotify('error', msg);
      return;
    }
    if (aDist && (!speed || speed <= 0)) {
      const msg = 'Kecepatan rata-rata (km/jam) wajib diisi untuk aktivitas berbasis jarak.';
      setFormError(msg);
      onNotify('error', msg);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: aName.trim(),
        category: aCategory,
        met,
        supports_distance: aDist,
        default_speed_kmh: speed,
      };
      if (editingAct) {
        await api.updateActivity(editingAct.id, payload);
        onNotify('success', 'Aktivitas kustom diperbarui.');
      } else {
        await api.createActivity(payload);
        onNotify('success', 'Aktivitas kustom ditambahkan.');
      }
      setShowActForm(false);
      await onRefreshCatalog();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan aktivitas.';
      setFormError(msg);
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFav = async (kind: 'foods' | 'activities', id: number) => {
    try {
      if (kind === 'foods') await api.toggleFoodFavorite(id);
      else await api.toggleActivityFavorite(id);
      await onRefreshCatalog();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal mengubah favorit.');
    }
  };

  const handleDelete = async (kind: 'foods' | 'activities', id: number, name: string) => {
    if (!window.confirm(`Hapus "${name}" dari katalog pribadi? Catatan harian lama tetap aman.`)) return;
    try {
      if (kind === 'foods') await api.deleteFood(id);
      else await api.deleteActivity(id);
      onNotify('success', `${name} dihapus dari katalog.`);
      await onRefreshCatalog();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus item.');
    }
  };

  const categories = subTab === 'foods' ? FOOD_CATEGORIES : ACT_CATEGORIES;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Katalog Makanan &amp; Aktivitas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tandai favorit agar muncul paling atas saat mencatat, atau tambahkan makanan/aktivitas kustom Anda sendiri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button
            type="button"
            onClick={subTab === 'foods' ? openNewFood : openNewAct}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {subTab === 'foods' ? 'Tambah Makanan Kustom' : 'Tambah Aktivitas Kustom'}
          </button>
        </div>
      </div>

      {/* Sub-tabs + Search */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
            <button
              type="button"
              onClick={() => {
                setSubTab('foods');
                setCategory('Semua');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                subTab === 'foods' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" /> Makanan ({foods.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSubTab('activities');
                setCategory('Semua');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                subTab === 'activities' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Aktivitas ({activities.length})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={subTab === 'foods' ? 'Cari nama makanan...' : 'Cari nama aktivitas...'}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setFavOnly(!favOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer shrink-0 ${
                favOnly
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              Favorit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                category === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      {subTab === 'foods' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFoods.map((f) => {
            const perServing = Math.round((f.serving_grams / 100) * f.calories_per_100g);
            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{f.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {f.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          f.is_custom ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {f.is_custom ? 'Kustom' : 'Bawaan'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Favorit"
                    onClick={() => handleToggleFav('foods', f.id)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${f.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                  <div className="text-xs text-slate-500 tabular-nums">
                    <p>
                      <strong className="text-emerald-700">{perServing} kkal</strong> / 1 {f.default_unit} ({f.serving_grams}g)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {f.calories_per_100g} kkal/100g • P {f.protein_per_100g} • K {f.carbs_per_100g} • L {f.fat_per_100g}
                    </p>
                  </div>
                  {f.is_custom && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditFood(f)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete('foods', f.id, f.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredActivities.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{a.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                      {a.category}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        a.is_custom ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {a.is_custom ? 'Kustom' : 'Bawaan'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Favorit"
                  onClick={() => handleToggleFav('activities', a.id)}
                  className="p-1.5 rounded-lg hover:bg-amber-50 cursor-pointer"
                >
                  <Star
                    className={`w-4 h-4 ${a.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                  />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                <div className="text-xs text-slate-500 tabular-nums">
                  <p>
                    <strong className="text-amber-700">MET {formatNum(a.met, 1)}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {a.supports_distance
                      ? `Bisa jarak (m/km) & menit • ~${a.default_speed_kmh} km/jam`
                      : 'Input berdasarkan durasi (menit)'}
                  </p>
                </div>
                {a.is_custom && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditAct(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete('activities', a.id, a.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Food Modal */}
      {showFoodForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">{editingFood ? 'Edit Makanan Kustom' : 'Tambah Makanan Kustom'}</h3>
              <button type="button" onClick={() => setShowFoodForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveFood} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto pb-safe">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Makanan</label>
                <input
                  type="text"
                  required
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  placeholder="Contoh: Ayam Suwir Kemangi"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={fCategory}
                    onChange={(e) => setFCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {FOOD_CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Standar</label>
                  <input
                    type="text"
                    value={fUnit}
                    onChange={(e) => setFUnit(e.target.value)}
                    placeholder="porsi / piring / potong"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Berat per 1 Satuan (gram)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={fGrams}
                    onChange={(e) => setFGrams(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kalori per 100g (kkal)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={fCal}
                    onChange={(e) => setFCal(e.target.value)}
                    placeholder="180"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Protein / 100g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fPro}
                    onChange={(e) => setFPro(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Karbo / 100g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fCarb}
                    onChange={(e) => setFCarb(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lemak / 100g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fFat}
                    onChange={(e) => setFFat(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-2.5 py-2 text-xs tabular-nums"
                  />
                </div>
              </div>
              {saving && <FormStatusBanner variant="loading" message="Menyimpan makanan kustom ke katalog..." />}
              {!saving && formError && <FormStatusBanner variant="error" message={formError} />}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setShowFoodForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Activity Modal */}
      {showActForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92dvh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">{editingAct ? 'Edit Aktivitas Kustom' : 'Tambah Aktivitas Kustom'}</h3>
              <button type="button" onClick={() => setShowActForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto pb-safe">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Aktivitas</label>
                <input
                  type="text"
                  required
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  placeholder="Contoh: Futsal Malam"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={aCategory}
                    onChange={(e) => setACategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    {ACT_CATEGORIES.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai MET (mis. 3–10)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={aMet}
                    onChange={(e) => setAMet(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={aDist}
                  onChange={(e) => setADist(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500"
                />
                Mendukung input jarak (meter / km)
              </label>
              {aDist && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kecepatan Rata-rata (km/jam)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    value={aSpeed}
                    onChange={(e) => setASpeed(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              )}
              {saving && <FormStatusBanner variant="loading" message="Menyimpan aktivitas kustom ke katalog..." />}
              {!saving && formError && <FormStatusBanner variant="error" message={formError} />}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" disabled={saving} onClick={() => setShowActForm(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
