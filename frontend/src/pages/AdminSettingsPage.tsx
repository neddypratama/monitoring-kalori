import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { AdminAiSettings, AiProvider } from '../types';
import { api } from '../api/client';
import { FormStatusBanner } from '../components/FormStatusBanner';
import { PasswordInput } from '../components/PasswordInput';

interface AdminSettingsPageProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

const PROVIDER_INFO: Record<
  AiProvider,
  {
    name: string;
    short: string;
    badge: string;
    badgeClass: string;
    placeholder: string;
    signupUrl: string;
    signupLabel: string;
    desc: string;
    steps: string[];
  }
> = {
  groq: {
    name: 'Groq Vision',
    short: 'Groq',
    badge: 'Gratis & Super Cepat',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    placeholder: 'Tempel API Key Groq (diawali gsk_...)',
    signupUrl: 'https://console.groq.com/keys',
    signupLabel: 'console.groq.com/keys',
    desc: 'Sangat cepat (~1–2 detik) dengan model Vision Llama 4, dan sangat jarang terkena antrean penuh (high demand).',
    steps: [
      'Buka console.groq.com/keys dan login gratis (bisa pakai akun Google / GitHub).',
      'Klik Create API Key, beri nama misal "KaloriKu", lalu salin kuncinya (diawali gsk_...).',
      'Tempel di kolom di atas dan klik Simpan Pengaturan AI.',
    ],
  },
  gemini: {
    name: 'Google Gemini',
    short: 'Gemini',
    badge: 'Gratis',
    badgeClass: 'bg-sky-100 text-sky-800',
    placeholder: 'Tempel API Key Google AI Studio (diawali AIza...)',
    signupUrl: 'https://aistudio.google.com/apikey',
    signupLabel: 'aistudio.google.com/apikey',
    desc: 'Akurat untuk masakan Indonesia. Jika model utama padat (high demand), Auto-Fallback akan otomatis mencoba model Flash lainnya.',
    steps: [
      'Buka aistudio.google.com/apikey dan login dengan akun Google Anda.',
      'Klik Create API Key, salin kuncinya (diawali AIza...).',
      'Tempel di kolom di atas lalu klik Simpan Pengaturan AI.',
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    short: 'OpenRouter',
    badge: 'Gratis & Banyak Model',
    badgeClass: 'bg-violet-100 text-violet-800',
    placeholder: 'Tempel API Key OpenRouter (diawali sk-or-...)',
    signupUrl: 'https://openrouter.ai/keys',
    signupLabel: 'openrouter.ai/keys',
    desc: '1 API Key untuk berbagai model Vision (termasuk router gratis openrouter/free, Qwen VL, Llama Vision, dan Gemini).',
    steps: [
      'Buka openrouter.ai/keys dan login (bisa pakai akun Google).',
      'Klik Create Key, salin kuncinya (diawali sk-or-...).',
      'Pilih openrouter/free (otomatis pilih model gratis yang aktif) atau ketik ID model lain.',
    ],
  },
  openai: {
    name: 'OpenAI',
    short: 'OpenAI',
    badge: 'Berbayar Stabil',
    badgeClass: 'bg-slate-200 text-slate-800',
    placeholder: 'Tempel API Key OpenAI (diawali sk-...)',
    signupUrl: 'https://platform.openai.com/api-keys',
    signupLabel: 'platform.openai.com/api-keys',
    desc: 'Sangat stabil (~Rp 2–5 per foto dengan gpt-4.1-mini / gpt-4o-mini), hampir tidak pernah mengalami high demand.',
    steps: [
      'Buka platform.openai.com/api-keys dan login ke akun OpenAI Anda.',
      'Klik Create new secret key, lalu salin kuncinya (diawali sk-...).',
      'Tempel di kolom di atas dan klik Simpan Pengaturan AI.',
    ],
  },
};

const PROVIDER_ORDER: AiProvider[] = ['groq', 'gemini', 'openrouter', 'openai'];

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<AdminAiSettings | null>(null);
  const [activeProvider, setActiveProvider] = useState<AiProvider>('groq');
  const [primaryProvider, setPrimaryProvider] = useState<AiProvider>('gemini');
  const [autoFallback, setAutoFallback] = useState(true);

  const [keys, setKeys] = useState<Record<AiProvider, string>>({
    gemini: '',
    groq: '',
    openrouter: '',
    openai: '',
  });
  const [models, setModels] = useState<Record<AiProvider, string>>({
    gemini: 'gemini-3.8-flash',
    groq: 'meta-llama/llama-4-scout-17b-16e-instruct',
    openrouter: 'openrouter/free',
    openai: 'gpt-4.1-mini',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const syncFromResponse = useCallback((res: AdminAiSettings) => {
    setSettings(res);
    setPrimaryProvider(res.primary_provider || 'gemini');
    setAutoFallback(res.auto_fallback ?? true);
    if (res.providers) {
      setModels({
        gemini: res.providers.gemini?.model || res.gemini_model || 'gemini-3.8-flash',
        groq: res.providers.groq?.model || 'meta-llama/llama-4-scout-17b-16e-instruct',
        openrouter: res.providers.openrouter?.model || 'openrouter/free',
        openai: res.providers.openai?.model || 'gpt-4.1-mini',
      });
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSettings();
      syncFromResponse(res);
      if (res.primary_provider) {
        setActiveProvider(res.primary_provider);
      }
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat pengaturan AI.');
    } finally {
      setLoading(false);
    }
  }, [onNotify, syncFromResponse]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.saveAdminSettings({
        primary_provider: primaryProvider,
        auto_fallback: autoFallback,
        gemini_api_key: keys.gemini.trim() || undefined,
        gemini_model: models.gemini,
        groq_api_key: keys.groq.trim() || undefined,
        groq_model: models.groq,
        openrouter_api_key: keys.openrouter.trim() || undefined,
        openrouter_model: models.openrouter,
        openai_api_key: keys.openai.trim() || undefined,
        openai_model: models.openai,
      });
      syncFromResponse(res);
      setKeys({ gemini: '', groq: '', openrouter: '', openai: '' });
      const msg = 'Pengaturan Multi-Provider Vision AI berhasil disimpan dan langsung aktif.';
      setStatusMsg({ type: 'success', text: msg });
      onNotify('success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan pengaturan AI.';
      setStatusMsg({ type: 'error', text: msg });
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (prov: AiProvider) => {
    const label = PROVIDER_INFO[prov].name;
    if (!window.confirm(`Hapus API Key ${label} yang tersimpan?`)) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const clearPayload: Record<string, unknown> = { [`clear_${prov}_key`]: true };
      const res = await api.saveAdminSettings(clearPayload);
      syncFromResponse(res);
      setKeys((prev) => ({ ...prev, [prov]: '' }));
      const msg = `API Key ${label} berhasil dihapus.`;
      setStatusMsg({ type: 'success', text: msg });
      onNotify('success', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus API Key.';
      setStatusMsg({ type: 'error', text: msg });
      onNotify('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedKeyInput = PROVIDER_ORDER.some((p) => keys[p].trim() !== '');

  const activeProvidersCount = PROVIDER_ORDER.filter((p) => settings?.providers?.[p]?.has_key).length;
  const currentInfo = PROVIDER_INFO[activeProvider];
  const currentProvStatus = settings?.providers?.[activeProvider];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" /> Pengaturan AI — Multi-Provider &amp; Auto-Fallback
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Hubungkan 1 atau beberapa provider AI (Groq gratis, Google Gemini, OpenRouter, atau OpenAI). Jika satu server sibuk, sistem otomatis pindah ke cadangan!
        </p>
      </div>

      {loading ? (
        <div className="p-8 bg-white rounded-3xl border border-slate-200/80 text-center text-sm text-slate-500">
          Memuat pengaturan AI...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Strategy & Auto-Fallback Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Strategi Provider &amp; Anti-Gagal</h3>
                  <p className="text-xs text-slate-500">
                    {activeProvidersCount > 0
                      ? `${activeProvidersCount} provider aktif tersambung.`
                      : 'Belum ada provider aktif — isi minimal 1 API Key di bawah.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROVIDER_ORDER.map((p) => {
                  const active = settings?.providers?.[p]?.has_key;
                  return (
                    <span
                      key={p}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {PROVIDER_INFO[p].short}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="ai-primary">
                  Provider Utama (Dicoba Pertama)
                </label>
                <select
                  id="ai-primary"
                  value={primaryProvider}
                  onChange={(e) => setPrimaryProvider(e.target.value as AiProvider)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PROVIDER_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_INFO[p].name} ({PROVIDER_INFO[p].badge})
                      {settings?.providers?.[p]?.has_key ? ' ✓ Aktif' : ' — Belum diisi'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={autoFallback}
                    onChange={(e) => setAutoFallback(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Aktifkan Auto-Fallback Otomatis
                    </span>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-snug">
                      Bila model/provider utama sedang <em>high demand</em> atau limit, otomatis pindah ke model &amp; provider cadangan yang aktif.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Provider Configuration Tabs */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100">
              {PROVIDER_ORDER.map((p) => {
                const isSelected = activeProvider === p;
                const hasKey = settings?.providers?.[p]?.has_key;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setActiveProvider(p)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${hasKey ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="truncate">{PROVIDER_INFO[p].short}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Provider Header & Status */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                currentProvStatus?.has_key
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    currentProvStatus?.has_key ? 'text-emerald-600' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold">{currentInfo.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentInfo.badgeClass}`}>
                      {currentInfo.badge}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-0.5">
                    {currentProvStatus?.has_key
                      ? `API Key tersimpan: ${currentProvStatus.key_masked}`
                      : currentInfo.desc}
                  </p>
                </div>
              </div>
              {currentProvStatus?.has_key && (
                <button
                  type="button"
                  onClick={() => handleClearKey(activeProvider)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer self-start sm:self-center shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Key
                </button>
              )}
            </div>

            {/* API Key + Model Form Fields for Selected Provider */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor={`key-${activeProvider}`}>
                  API Key {currentInfo.name}{' '}
                  {currentProvStatus?.has_key && (
                    <span className="font-normal text-slate-400">(kosongkan jika tidak ingin mengganti)</span>
                  )}
                </label>
                <PasswordInput
                  id={`key-${activeProvider}`}
                  value={keys[activeProvider]}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))}
                  placeholder={currentInfo.placeholder}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor={`model-${activeProvider}`}>
                  Model Vision ({currentInfo.name})
                </label>
                <select
                  id={`model-${activeProvider}`}
                  value={models[activeProvider]}
                  onChange={(e) => setModels((prev) => ({ ...prev, [activeProvider]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {(currentProvStatus?.allowed_models ?? [models[activeProvider]]).map((m, idx) => (
                    <option key={m} value={m}>
                      {m} {idx === 0 ? '(Disarankan)' : ''}
                    </option>
                  ))}
                </select>
                {activeProvider === 'openrouter' && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tips: <code>openrouter/free</code> otomatis memilih model gratis yang aktif saat ini.
                  </p>
                )}
              </div>
            </div>

            {/* Setup Guide */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center justify-between gap-2 flex-wrap">
                <span>Cara mendapatkan API Key {currentInfo.name}:</span>
                <a
                  href={currentInfo.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  {currentInfo.signupLabel} <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                {currentInfo.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>

            {saving && <FormStatusBanner variant="loading" message="Menyimpan pengaturan AI ke server..." />}
            {!saving && hasUnsavedKeyInput && (
              <FormStatusBanner
                variant="info"
                message='Anda memasukkan API Key baru — klik "Simpan Pengaturan AI" di bawah agar tersimpan ke server.'
              />
            )}
            {!saving && statusMsg && <FormStatusBanner variant={statusMsg.type} message={statusMsg.text} />}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan AI'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
