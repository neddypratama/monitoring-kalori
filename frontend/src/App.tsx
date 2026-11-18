import React, { useCallback, useEffect, useState } from 'react';
import type {
  ActivityItem,
  ActivityLog,
  AppTab,
  AuthUser,
  DashboardData,
  DashboardRange,
  DayLogsData,
  FoodItem,
  FoodLog,
  MealType,
  ProfileResponse,
  ToastMessage,
  WeightLog,
} from './types';
import { api } from './api/client';
import { getLocalDateIso } from './utils/calculators';
import { AuthView } from './components/AuthView';
import { Layout } from './components/Layout';
import { OnboardingView } from './components/OnboardingView';
import { ActivityLogModal, FoodLogModal, WeightLogModal } from './components/QuickLogModals';
import { DashboardPage } from './pages/DashboardPage';
import { DailyLogPage } from './pages/DailyLogPage';
import { CatalogPage } from './pages/CatalogPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminRolesPage } from './pages/AdminRolesPage';
import { AdminAuditLogsPage } from './pages/AdminAuditLogsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

export const App: React.FC = () => {
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profileRes, setProfileRes] = useState<ProfileResponse | null>(null);

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [range, setRange] = useState<DashboardRange>('7d');
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateIso());

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dayData, setDayData] = useState<DayLogsData | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Modals state
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [foodModalMeal, setFoodModalMeal] = useState<MealType>('siang');
  const [editingFoodLog, setEditingFoodLog] = useState<FoodLog | null>(null);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivityLog, setEditingActivityLog] = useState<ActivityLog | null>(null);

  const [weightModalOpen, setWeightModalOpen] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    const id = Date.now();
    setToast({ id, type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === id ? null : prev));
    }, 3600);
  }, []);

  const refreshCatalog = useCallback(async () => {
    const [fList, aList] = await Promise.all([api.getFoods(), api.getActivities()]);
    setFoods(fList);
    setActivities(aList);
  }, []);

  const refreshAllData = useCallback(
    async (targetRange: DashboardRange = range, targetDate: string = selectedDate) => {
      setDataLoading(true);
      try {
        const todayIso = getLocalDateIso();
        const [pRes, dashRes, dayRes, wList] = await Promise.all([
          api.getProfile(),
          api.getDashboard(targetRange, todayIso),
          api.getDayLogs(targetDate),
          api.getWeightLogs(),
        ]);
        setProfileRes(pRes);
        setDashboard(dashRes);
        setDayData(dayRes);
        setWeightLogs(wList);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Gagal memuat data terbaru.');
      } finally {
        setDataLoading(false);
      }
    },
    [range, selectedDate, notify]
  );

  const loadAfterAuth = useCallback(async () => {
    const pRes = await api.getProfile();
    setProfileRes(pRes);
    if (pRes.exists) {
      await Promise.all([refreshCatalog(), refreshAllData('7d', getLocalDateIso())]);
    } else {
      setDashboard(null);
      setDayData(null);
      setWeightLogs([]);
    }
  }, [refreshCatalog, refreshAllData]);

  // Initial bootstrap: check session
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await api.getMe();
        if (!active) return;
        if (me.authenticated && me.user) {
          setAuthUser(me.user);
          await loadAfterAuth();
        }
      } catch (err) {
        if (!active) return;
        setBootError(err instanceof Error ? err.message : 'Gagal terhubung ke server PHP.');
      } finally {
        if (active) setBootLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthenticated = async (user: AuthUser) => {
    setAuthUser(user);
    setActiveTab('dashboard');
    setBootLoading(true);
    try {
      await loadAfterAuth();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal memuat data akun.');
    } finally {
      setBootLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout network errors; clear client session state anyway
    }
    setAuthUser(null);
    setProfileRes(null);
    setDashboard(null);
    setDayData(null);
    setWeightLogs([]);
    setActiveTab('dashboard');
  };

  const handleRangeChange = async (nextRange: DashboardRange) => {
    setRange(nextRange);
    try {
      const dashRes = await api.getDashboard(nextRange, getLocalDateIso());
      setDashboard(dashRes);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal memuat grafik.');
    }
  };

  const handleDateChange = async (nextDate: string) => {
    setSelectedDate(nextDate);
    try {
      const dayRes = await api.getDayLogs(nextDate);
      setDayData(dayRes);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal memuat catatan tanggal tersebut.');
    }
  };

  const handleOnboardingComplete = async (res: ProfileResponse) => {
    setProfileRes(res);
    await Promise.all([refreshCatalog(), refreshAllData('7d', getLocalDateIso())]);
    notify('success', 'Profil siap! Selamat menjalankan program diet Anda.');
  };

  const openFoodModal = (meal: MealType = 'siang', editing: FoodLog | null = null) => {
    setFoodModalMeal(meal);
    setEditingFoodLog(editing);
    setFoodModalOpen(true);
  };

  const openActivityModal = (editing: ActivityLog | null = null) => {
    setEditingActivityLog(editing);
    setActivityModalOpen(true);
  };

  const handleDeleteFoodLog = async (id: number) => {
    try {
      await api.deleteFoodLog(id);
      await refreshAllData();
      notify('success', 'Catatan makanan dihapus.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal menghapus catatan makanan.');
    }
  };

  const handleDeleteActivityLog = async (id: number) => {
    try {
      await api.deleteActivityLog(id);
      await refreshAllData();
      notify('success', 'Catatan aktivitas dihapus.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Gagal menghapus catatan aktivitas.');
    }
  };

  if (bootLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Memuat KaloriKu...</p>
        </div>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-rose-200 shadow-sm space-y-3 text-center">
          <h1 className="text-lg font-extrabold text-rose-700">Koneksi API Bermasalah</h1>
          <p className="text-sm text-slate-600">{bootError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthView onAuthenticated={handleAuthenticated} />;
  }

  // Allow users with admin panel permissions to either complete onboarding OR skip straight to admin?
  // Onboarding is quick and gives them personal diet tracking too; show onboarding when profile doesn't exist yet.
  if (!profileRes || !profileRes.exists || !profileRes.profile || !profileRes.metrics) {
    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  const activeDateForQuickAdd = activeTab === 'logs' ? selectedDate : getLocalDateIso();
  const currentWeightKg = profileRes.metrics.current_weight_kg;

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      authUser={authUser}
      onLogout={handleLogout}
      onQuickFood={() => openFoodModal('siang', null)}
      onQuickActivity={() => openActivityModal(null)}
      onQuickWeight={() => setWeightModalOpen(true)}
      toast={toast}
      onDismissToast={() => setToast(null)}
    >
      {activeTab === 'dashboard' && (
        <DashboardPage
          dashboard={dashboard}
          userName={profileRes.profile.name || authUser.full_name}
          range={range}
          onRangeChange={handleRangeChange}
          onOpenFoodModal={() => openFoodModal('siang', null)}
          onOpenActivityModal={() => openActivityModal(null)}
          onOpenWeightModal={() => setWeightModalOpen(true)}
          loading={dataLoading}
        />
      )}

      {activeTab === 'logs' && (
        <DailyLogPage
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          dayData={dayData}
          loading={dataLoading}
          onAddFood={(meal) => openFoodModal(meal, null)}
          onEditFood={(log) => openFoodModal(log.meal_type, log)}
          onDeleteFood={handleDeleteFoodLog}
          onAddActivity={() => openActivityModal(null)}
          onEditActivity={(log) => openActivityModal(log)}
          onDeleteActivity={handleDeleteActivityLog}
          onLogWeight={() => setWeightModalOpen(true)}
        />
      )}

      {activeTab === 'catalog' && (
        <CatalogPage
          foods={foods}
          activities={activities}
          onRefreshCatalog={refreshCatalog}
          onNotify={(t, msg) => notify(t, msg)}
        />
      )}

      {activeTab === 'profile' && (
        <ProfilePage
          profile={profileRes.profile}
          metrics={profileRes.metrics}
          weightLogs={weightLogs}
          onProfileUpdated={() => refreshAllData()}
          onOpenWeightModal={() => setWeightModalOpen(true)}
          onNotify={(t, msg) => notify(t, msg)}
        />
      )}

      {activeTab === 'admin-users' && (
        <AdminUsersPage currentUser={authUser} onNotify={(t, msg) => notify(t, msg)} />
      )}

      {activeTab === 'admin-roles' && <AdminRolesPage onNotify={(t, msg) => notify(t, msg)} />}

      {activeTab === 'admin-logs' && <AdminAuditLogsPage onNotify={(t, msg) => notify(t, msg)} />}

      {activeTab === 'admin-settings' && <AdminSettingsPage onNotify={(t, msg) => notify(t, msg)} />}

      <FoodLogModal
        isOpen={foodModalOpen}
        date={activeDateForQuickAdd}
        initialMealType={foodModalMeal}
        editingLog={editingFoodLog}
        foods={foods}
        onClose={() => setFoodModalOpen(false)}
        onSaved={async (msg) => {
          await refreshAllData();
          notify('success', msg);
        }}
        onFoodCreated={(newFood) => setFoods((prev) => [newFood, ...prev])}
      />

      <ActivityLogModal
        isOpen={activityModalOpen}
        date={activeDateForQuickAdd}
        currentWeightKg={currentWeightKg}
        editingLog={editingActivityLog}
        activities={activities}
        onClose={() => setActivityModalOpen(false)}
        onSaved={async (msg) => {
          await refreshAllData();
          notify('success', msg);
        }}
      />

      <WeightLogModal
        isOpen={weightModalOpen}
        date={activeDateForQuickAdd}
        initialWeight={currentWeightKg}
        onClose={() => setWeightModalOpen(false)}
        onSaved={async (msg) => {
          await refreshAllData();
          notify('success', msg);
        }}
      />
    </Layout>
  );
};

export default App;
