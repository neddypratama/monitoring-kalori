import React from 'react';
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
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import type { AppTab, AuthUser, ToastMessage } from '../types';

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

const BASE_NAV: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'logs', label: 'Catatan Harian', icon: CalendarDays },
  { id: 'catalog', label: 'Katalog', icon: BookOpen },
  { id: 'profile', label: 'Profil & Diet', icon: User },
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
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

        <div className="mt-6 px-3 py-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5">
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
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight text-slate-900 block leading-none">KaloriKu</span>
            <span className="text-[10px] text-slate-500">{authUser.username} ({authUser.role_name})</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onQuickFood}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
          >
            <Utensils className="w-3.5 h-3.5" /> Makan
          </button>
          <button
            type="button"
            onClick={onQuickActivity}
            className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" /> Olahraga
          </button>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-1 py-2 flex justify-around z-20 overflow-x-auto">
        {[...BASE_NAV, ...adminNav].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold shrink-0 ${
                active ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 max-w-sm">
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
            <span>{toast.text}</span>
            <button type="button" onClick={onDismissToast} className="ml-1 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
