import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flame,
  LayoutDashboard,
  LogOut,
  Scale,
  Shield,
  Smartphone,
  Sparkles,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import type { AppTab, AuthUser, ToastMessage } from '../types';
import { InstallAppModal } from './InstallAppModal';
import { InstallPromptBanner } from './InstallPromptBanner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface LayoutProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  authUser: AuthUser;
  onLogout: () => void;
  onQuickFood: () => void;
  onQuickActivity: () => void;
  onQuickWeight: () => void;
  toast: ToastMessage | null;
  onDismissToast: () => void;
  children: React.ReactNode;
}

const BASE_NAV: { id: AppTab; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Beranda', icon: LayoutDashboard },
  { id: 'logs', label: 'Catatan Harian', shortLabel: 'Catatan', icon: CalendarDays },
  { id: 'catalog', label: 'Katalog', shortLabel: 'Katalog', icon: BookOpen },
  { id: 'profile', label: 'Profil & Diet', shortLabel: 'Profil', icon: User },
];

export const Layout: React.FC<LayoutProps> = ({
  activeTab,
  onTabChange,
  authUser,
  onLogout,
  onQuickFood,
  onQuickActivity,
  onQuickWeight,
  toast,
  onDismissToast,
  children,
}) => {
  const [adminSheetOpen, setAdminSheetOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const adminNav: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  if (authUser.permissions.can_manage_users || authUser.permissions.can_view_all_users_data) {
    adminNav.push({ id: 'admin-users', label: 'Kelola User', icon: Users });
  }
  if (authUser.permissions.can_manage_roles) {
    adminNav.push({ id: 'admin-roles', label: 'Kelola Role', icon: Shield });
  }
  if (authUser.permissions.can_view_audit_logs) {
    adminNav.push({ id: 'admin-logs', label: 'Log Sistem', icon: ClipboardList });
  }
  if (authUser.permissions.can_manage_roles || authUser.permissions.can_manage_users) {
    adminNav.push({ id: 'admin-settings', label: 'Pengaturan AI', icon: Sparkles });
  }

  const isAdminTabActive = activeTab.startsWith('admin-');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* ==================== DESKTOP SIDEBAR (lg+) ==================== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-slate-200/80 px-4 py-6 justify-between z-20 overflow-y-auto">
        <div>
          <div className="flex items-center gap-3 px-2 mb-7">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-200">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">KaloriKu</h1>
              <p className="text-xs text-slate-500">Program Diet &amp; Kalori</p>
            </div>
          </div>

          <nav className="space-y-1">
            {BASE_NAV.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {adminNav.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Panel Admin
              </p>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Catat Cepat
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onQuickFood}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs"
              >
                <Utensils className="w-4 h-4" />
                Catat Makan
              </button>
              <button
                type="button"
                onClick={onQuickActivity}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 transition cursor-pointer"
              >
                <Activity className="w-4 h-4 text-amber-600" />
                Catat Aktivitas
              </button>
              <button
                type="button"
                onClick={onQuickWeight}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200/80 transition cursor-pointer"
              >
                <Scale className="w-4 h-4 text-indigo-600" />
                Catat Berat Badan
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={() => setInstallModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer transition shadow-2xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Pasang / Download App
          </button>
          <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{authUser.full_name || authUser.username}</p>
                <p className="text-[11px] text-slate-500 truncate">@{authUser.username}</p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase shrink-0">
                {authUser.role_name}
              </span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold text-slate-600 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* ==================== TABLET TOP BAR (md to <lg) ==================== */}
      <header className="hidden md:flex lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-6 py-3 flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 leading-none block">KaloriKu</span>
              <span className="text-[11px] text-slate-500">
                {authUser.full_name || authUser.username} • <strong className="uppercase">{authUser.role_name}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onQuickFood}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" /> Catat Makan
            </button>
            <button
              type="button"
              onClick={onQuickActivity}
              className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" /> Catat Aktivitas
            </button>
            <button
              type="button"
              onClick={onQuickWeight}
              className="px-3 py-2 rounded-xl bg-indigo-100 text-indigo-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" /> Berat Badan
            </button>
            <button
              type="button"
              onClick={() => setInstallModalOpen(true)}
              title="Download / Pasang Aplikasi (Android & iOS)"
              aria-label="Download / Pasang Aplikasi"
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer transition"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar"
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {BASE_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
          {adminNav.length > 0 && <span className="h-4 w-px bg-slate-200 mx-1 shrink-0" />}
          {adminNav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition ${
                  active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* ==================== MOBILE TOP HEADER (<md) ==================== */}
      <header className="md:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 block leading-none">KaloriKu</span>
            <span className="text-[10px] text-slate-500 truncate block mt-0.5">
              @{authUser.username} • {authUser.role_name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onQuickFood}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition"
          >
            <Utensils className="w-3.5 h-3.5" /> Makan
          </button>
          <button
            type="button"
            onClick={onQuickActivity}
            className="px-2.5 py-1.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 active:scale-95 transition"
          >
            <Activity className="w-3.5 h-3.5" /> Gerak
          </button>
          <button
            type="button"
            onClick={() => setInstallModalOpen(true)}
            aria-label="Download & Pasang Aplikasi"
            title="Download & Pasang Aplikasi"
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95 transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar"
            className="p-2 rounded-xl bg-slate-100 text-slate-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 lg:pl-64 pb-24 md:pb-10">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6">{children}</div>
      </main>

      {/* ==================== MOBILE BOTTOM NAV (<md, max 5 clean slots) ==================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 px-1.5 pt-1.5 pb-safe flex justify-around z-20 shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        {BASE_NAV.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAdminSheetOpen(false);
                onTabChange(item.id);
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
                active ? 'text-emerald-600 bg-emerald-50/70' : 'text-slate-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
        {adminNav.length > 0 && (
          <button
            type="button"
            onClick={() => setAdminSheetOpen(true)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[11px] font-bold transition ${
              isAdminTabActive ? 'text-slate-900 bg-slate-100' : 'text-slate-500'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Admin</span>
          </button>
        )}
      </nav>

      {/* ==================== MOBILE ADMIN DRAWER SHEET (<md) ==================== */}
      {adminSheetOpen && adminNav.length > 0 && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs flex items-end"
          onClick={() => setAdminSheetOpen(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 pb-safe space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">Panel Admin</h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminSheetOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onTabChange(item.id);
                      setAdminSheetOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3.5 rounded-2xl text-sm font-bold border transition ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TOAST NOTIFICATION ==================== */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-3.5 left-3.5 sm:left-auto sm:right-6 z-50 sm:max-w-sm">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium ${
              toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-900 border-slate-800 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="flex-1">{toast.text}</span>
            <button type="button" onClick={onDismissToast} className="ml-1 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {/* ==================== INSTALL APP MODAL & FLOATING BANNER ==================== */}
      <InstallAppModal
        isOpen={installModalOpen}
        onClose={() => setInstallModalOpen(false)}
        installPrompt={installPrompt}
        onPromptInstall={handleInstallApp}
      />
      <InstallPromptBanner onOpenModal={() => setInstallModalOpen(true)} />
    </div>
  );
};
