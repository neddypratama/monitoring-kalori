import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

interface InstallPromptBannerProps {
  onOpenModal: () => void;
}

export const InstallPromptBanner: React.FC<InstallPromptBannerProps> = ({ onOpenModal }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if running as installed standalone PWA
    const isStandalone = (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean }).standalone === true);
    
    if (isStandalone) {
      return;
    }

    // Check if dismissed in this session or recently
    const dismissed = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('kaloriku_install_dismissed') : null;
    if (!dismissed) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('kaloriku_install_dismissed', '1');
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900/95 text-white p-3 sm:p-3.5 rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight truncate">Pasang Aplikasi KaloriKu</p>
            <p className="text-[11px] text-slate-300 leading-tight">Android (APK) & iPhone (iOS)</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" /> Pasang
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup pemberitahuan"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
