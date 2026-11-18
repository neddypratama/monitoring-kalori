import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Save, Sparkles, Trash2 } from 'lucide-react';
import type { AdminAiSettings } from '../types';
import { api } from '../api/client';
import { PasswordInput } from '../components/PasswordInput';

interface AdminSettingsPageProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<AdminAiSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSettings();
      setSettings(res);
      setModel(res.gemini_model);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal memuat pengaturan AI.');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.saveAdminSettings({
        gemini_api_key: apiKey.trim() || undefined,
        gemini_model: model,
      });
      setSettings(res);
      setApiKey('');
      onNotify('success', 'Pengaturan Google Gemini Vision AI berhasil disimpan.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan AI.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('Hapus API Key Gemini yang tersimpan? Fitur Foto Makanan AI akan nonaktif sementara.')) return;
    setSaving(true);
    try {
      const res = await api.saveAdminSettings({ clear_gemini_key: true, gemini_model: model });
      setSettings(res);
      setApiKey('');
      onNotify('success', 'API Key Gemini dihapus.');
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Gagal menghapus API Key.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" /> Pengaturan AI — Foto Makanan (Gemini Vision)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur API Key Google Gemini agar seluruh user dapat memotret atau mengunggah foto makanan untuk menghitung kalorinya otomatis.
        </p>
      </div>

      {loading ? (
        <div className="p-8 bg-white rounded-3xl border border-slate-200/80 text-center text-sm text-slate-500">
          Memuat pengaturan AI...
        </div>
      ) : (
        <form
          onSubmit={handleSave}
          className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5"
        >
          {/* Current Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              settings?.has_gemini_key
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  settings?.has_gemini_key ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <div>
                <p className="text-sm font-bold">
                  {settings?.has_gemini_key ? 'API Key Gemini Aktif' : 'API Key Gemini Belum Diatur'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {settings?.has_gemini_key
                    ? `Kunci tersimpan: ${settings.gemini_key_masked}`
                    : 'Fitur Foto Makanan AI memerlukan API Key gratis dari Google AI Studio.'}
                </p>
              </div>
            </div>
            {settings?.has_gemini_key && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold cursor-pointer self-start sm:self-center"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Key
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="gemini-key">
                Google Gemini API Key{' '}
                {settings?.has_gemini_key && (
                  <span className="font-normal text-slate-400">(kosongkan jika tidak ingin mengganti)</span>
                )}
              </label>
              <PasswordInput
                id="gemini-key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Tempel API Key dari aistudio.google.com/apikey (AIza...)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="gemini-model">
                Model Vision AI
              </label>
              <select
                id="gemini-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {(settings?.allowed_models ?? ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash']).map(
                  (m) => (
                    <option key={m} value={m}>
                      {m} {m === 'gemini-3.8-flash' ? '(Disarankan — Terbaru, Cepat & Akurat)' : ''}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <p className="font-bold text-slate-800">Cara mendapatkan API Key Gratis Google Gemini:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Buka{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-semibold underline inline-flex items-center gap-0.5"
                >
                  aistudio.google.com/apikey <ExternalLink className="w-3 h-3" />
                </a>{' '}
                dan login dengan akun Google Anda.
              </li>
              <li>Klik <strong>Create API Key</strong>, salin kuncinya (diawali <code>AIza...</code>).</li>
              <li>Tempel di kolom di atas lalu klik <strong>Simpan Pengaturan</strong>. API Key tersimpan aman di database server (tidak pernah dikirim ke browser user).</li>
            </ol>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
