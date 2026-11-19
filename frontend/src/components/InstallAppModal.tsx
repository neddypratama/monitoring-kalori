import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Apple, QrCode, Check, Copy, X, ShieldCheck, Share2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  installPrompt?: BeforeInstallPromptEvent | null;
  onPromptInstall?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  installPrompt,
  onPromptInstall,
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'qr'>('android');
  const [copied, setCopied] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect Standalone mode (already installed)
    const standalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsStandalone(Boolean(standalone));

    // Auto-detect OS
    const ua = navigator.userAgent || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
    const isAndroid = /Android/i.test(ua);

    if (isIos) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kalori.bimapratama.com';
  const apkDownloadUrl = '/downloads/KaloriKu.apk';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-white shrink-0 border border-white/20 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">Pasang Aplikasi KaloriKu</h3>
              <p className="text-emerald-100 text-xs">Tersedia untuk Android & iPhone (iOS)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (APK)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Apple className="w-4 h-4 text-slate-800" />
            <span>iPhone (iOS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-800 shadow-xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Scan QR / PC</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {isStandalone && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Aplikasi KaloriKu sudah terpasang dan berjalan di perangkat Anda!</span>
            </div>
          )}

          {/* TAB 1: ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mb-2">
                  Pilihan 1 • Paling Praktis (PWA 1-Klik)
                </span>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Pasang Langsung via Browser</h4>
                <p className="text-xs text-slate-600 mb-3">
                  Tanpa download file besar, tidak perlu mengaktifkan sumber tidak dikenal. Cukup 1 klik langsung muncul di layar HP Anda.
                </p>
                {installPrompt ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onPromptInstall) onPromptInstall();
                      onClose();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Pasang Sekarang di Layar HP
                  </button>
                ) : (
                  <div className="text-xs text-slate-500 bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center gap-2">
                    <span className="font-semibold text-emerald-700">Tips Chrome Android:</span>
                    <span>Tekan menu titik tiga (<strong className="text-slate-800">⋮</strong>) di Chrome lalu pilih <strong className="text-slate-800">"Tambahkan ke Layar Utama"</strong>.</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-bold uppercase mb-2">
                  Pilihan 2 • Download File APK (.apk)
                </span>
                <h4 className="text-sm font-bold text-slate-800 mb-1">Download APK Resmi KaloriKu</h4>
                <p className="text-xs text-slate-600 mb-3">
                  Unduh file installer APK native ringan (~20 KB) untuk dipasang di smartphone Android Anda atau dibagikan ke teman.
                </p>
                <a
                  href={apkDownloadUrl}
                  download="KaloriKu.apk"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer no-underline"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Download File KaloriKu.apk (~20 KB)
                </a>

                <div className="mt-3.5 pt-3 border-t border-slate-200/70 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cara Memasang APK:
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-600 pl-1">
                    <li>Buka file <strong>KaloriKu.apk</strong> setelah selesai didownload.</li>
                    <li>Jika muncul peringatan <em>"Instal aplikasi dari sumber tidak dikenal"</em>, pilih <strong>Izinkan / Lanjutkan</strong>.</li>
                    <li>Tekan <strong>Install</strong> dan buka aplikasi dari Homescreen.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IOS (IPHONE / IPAD) */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <Apple className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Catatan untuk Pengguna iPhone & iPad:</strong>
                  Sistem Apple iOS <strong>tidak menggunakan file APK</strong> (hanya khusus Android). Sebagai gantinya, Anda dapat memasang KaloriKu secara resmi & instan melalui Safari tanpa perlu ke App Store:
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    Buka situs <strong>{currentUrl}</strong> menggunakan browser bawaan <strong>Safari</strong> di iPhone Anda.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    Tekan tombol <strong>Bagikan (Share)</strong> di bilah menu bawah Safari (ikon kotak dengan panah ke atas: <Share2 className="w-3.5 h-3.5 inline text-blue-600" />).
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-slate-700">
                    Gulir sedikit ke bawah, lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div className="text-xs text-slate-700">
                    Tekan <strong>"Tambah" (Add)</strong> di pojok kanan atas. Ikon <strong>KaloriKu</strong> akan langsung muncul di Homescreen iPhone Anda dan dapat dibuka layar penuh (*fullscreen*) seperti aplikasi native!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCAN QR / PC */}
          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-slate-600">
                Arahkan kamera smartphone Android atau iPhone Anda ke kode QR di bawah untuk langsung membuka & memasang KaloriKu:
              </p>
              
              <div className="p-4 bg-white border border-slate-200 rounded-3xl inline-block shadow-sm">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`}
                  alt="QR Code KaloriKu"
                  className="w-44 h-44 rounded-xl mx-auto block"
                  loading="lazy"
                />
              </div>

              <div className="flex items-center gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="w-full py-2 px-3 bg-slate-100 rounded-xl text-xs font-mono text-slate-700 border border-slate-200 text-center select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Aman & Bebas Iklan
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
