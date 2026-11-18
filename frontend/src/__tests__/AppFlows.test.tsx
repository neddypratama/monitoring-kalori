import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem, AuthUser, DashboardData, FoodItem, ProfileResponse } from '../types';
import { App } from '../App';
import { Layout } from '../components/Layout';
import { ActivityLogModal, FoodLogModal } from '../components/QuickLogModals';
import { DashboardPage } from '../pages/DashboardPage';

vi.mock('../api/client', () => ({
  buildApiUrl: (route: string) => `./api.php?route=${route}`,
  api: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    saveProfile: vi.fn(),
    getFoods: vi.fn(),
    searchOpenFoodFacts: vi.fn(),
    getActivities: vi.fn(),
    getDashboard: vi.fn(),
    getDayLogs: vi.fn(),
    getWeightLogs: vi.fn(),
    createFoodLog: vi.fn(),
    createActivityLog: vi.fn(),
    saveWeightLog: vi.fn(),
  },
}));

import { api } from '../api/client';

const ADMIN_USER: AuthUser = {
  id: 1,
  username: 'admin',
  full_name: 'Administrator',
  role_id: 1,
  role_name: 'admin',
  role_description: 'Admin penuh',
  is_active: true,
  permissions: {
    can_manage_users: true,
    can_manage_roles: true,
    can_view_all_users_data: true,
    can_view_audit_logs: true,
  },
  created_at: '2026-11-18',
  updated_at: '2026-11-18',
};

const REGULAR_USER: AuthUser = {
  ...ADMIN_USER,
  id: 2,
  username: 'siti',
  full_name: 'Siti',
  role_id: 2,
  role_name: 'user',
  permissions: {
    can_manage_users: false,
    can_manage_roles: false,
    can_view_all_users_data: false,
    can_view_audit_logs: false,
  },
};

const SAMPLE_FOODS: FoodItem[] = [
  {
    id: 1,
    name: 'Nasi Putih',
    category: 'Makanan Pokok',
    default_unit: 'piring',
    serving_grams: 150,
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbs_per_100g: 28.0,
    fat_per_100g: 0.3,
    is_custom: false,
    is_favorite: true,
  },
];

const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: 1,
    name: 'Jalan Santai',
    category: 'Jalan & Lari',
    met: 3.3,
    supports_distance: true,
    default_speed_kmh: 4.5,
    is_custom: false,
    is_favorite: true,
  },
];

const SAMPLE_DASHBOARD: DashboardData = {
  range: '7d',
  today_summary: {
    date: '2026-11-18',
    calories_in: 1450,
    calories_burned: 120,
    baseline_tdee: 1971,
    total_expenditure: 2091,
    calorie_balance: -641,
    daily_target: 1500,
    remaining_quota: 170,
    protein: 65,
    carbs: 160,
    fat: 45,
    weight_on_date: 69.5,
    effective_weight: 69.5,
    food_count: 3,
    activity_count: 1,
  },
  metrics: {
    current_weight_kg: 69.5,
    initial_weight_kg: 70.5,
    weight_change_from_start_kg: -1.0,
    bmi: 24.0,
    bmi_category: 'Normal',
    bmr: 1637.5,
    tdee: 1965,
    recommended_calorie_target: 1500,
    active_calorie_target: 1500,
    is_manual_target: false,
  },
  evaluation: {
    status: 'on_track',
    label: 'Sesuai Jalur',
    explanation: 'Perkembangan berat badan aktual Anda selaras dengan catatan kalori.',
    actual_delta_kg: -0.6,
    theoretical_delta_kg: -0.55,
    difference_kg: -0.05,
    cumulative_balance_kcal: -4235,
    weight_days: 5,
    calorie_days: 5,
    start_date: '2026-11-12',
    end_date: '2026-11-18',
    start_weight_kg: 70.1,
    end_weight_kg: 69.5,
  },
  calorie_series: [
    { date: '2026-11-18', calories_in: 1450, calories_burned: 120, target: 1500, baseline_tdee: 1971, balance: -641 },
  ],
  weight_series: [
    { date: '2026-11-18', actual_weight: 69.5, moving_avg_7d: 69.8, projected_weight: 69.55, target_weight: 65 },
  ],
};

describe('KaloriKu UI flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows AuthView when unauthenticated and logs in to OnboardingView', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMe).mockResolvedValueOnce({ authenticated: false, user: null });
    vi.mocked(api.login).mockResolvedValueOnce({ user: ADMIN_USER });
    vi.mocked(api.getProfile).mockResolvedValueOnce({ exists: false, profile: null, metrics: null });

    render(<App />);

    expect(await screen.findByText(/Masuk Akun/i)).toBeInTheDocument();
    expect(screen.queryByText(/Admin default awal/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/admin123/i)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Username/i), 'admin');
    await user.type(screen.getByLabelText(/^Password/i), 'admin123');
    await user.click(screen.getByRole('button', { name: /^Masuk$/i }));

    expect(await screen.findByText(/Selamat Datang di KaloriKu/i)).toBeInTheDocument();
  });

  it('shows OnboardingView for authenticated user without profile and submits profile', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMe).mockResolvedValueOnce({ authenticated: true, user: REGULAR_USER });
    vi.mocked(api.getProfile).mockResolvedValueOnce({ exists: false, profile: null, metrics: null });

    const createdProfile: ProfileResponse = {
      exists: true,
      profile: {
        user_id: 2,
        name: 'Budi',
        gender: 'male',
        age: 25,
        height_cm: 170,
        initial_weight_kg: 70,
        target_weight_kg: 65,
        activity_level: 'sedentary',
        goal_type: 'lose',
        daily_calorie_target: null,
        is_manual_target: false,
        created_at: '2026-11-18',
        updated_at: '2026-11-18',
      },
      metrics: SAMPLE_DASHBOARD.metrics,
    };
    vi.mocked(api.saveProfile).mockResolvedValueOnce(createdProfile);
    vi.mocked(api.getProfile).mockResolvedValue(createdProfile);
    vi.mocked(api.getFoods).mockResolvedValue(SAMPLE_FOODS);
    vi.mocked(api.getActivities).mockResolvedValue(SAMPLE_ACTIVITIES);
    vi.mocked(api.getDashboard).mockResolvedValue(SAMPLE_DASHBOARD);
    vi.mocked(api.getDayLogs).mockResolvedValue({
      date: '2026-11-18',
      summary: SAMPLE_DASHBOARD.today_summary,
      food_logs: [],
      activity_logs: [],
      weight_log: null,
    });
    vi.mocked(api.getWeightLogs).mockResolvedValue([]);

    render(<App />);

    expect(await screen.findByText(/Selamat Datang di KaloriKu/i)).toBeInTheDocument();
    const weightInput = screen.getByLabelText(/Berat Badan Saat Ini/i);
    await user.clear(weightInput);
    await user.type(weightInput, '70');

    expect(screen.getByText(/24,2/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Mulai Program Diet/i }));

    await waitFor(() => {
      expect(api.saveProfile).toHaveBeenCalledTimes(1);
    });
  });

  it('auto-calculates 27 kkal in ActivityLogModal for Jalan Santai 500 m at 70 kg', async () => {
    const user = userEvent.setup();
    render(
      <ActivityLogModal
        isOpen={true}
        date="2026-11-18"
        currentWeightKg={70}
        activities={SAMPLE_ACTIVITIES}
        onClose={() => {}}
        onSaved={() => {}}
      />
    );

    await user.click(screen.getByText('Jalan Santai'));
    const valInput = screen.getByLabelText(/Jarak/i);
    await user.clear(valInput);
    await user.type(valInput, '500');

    expect(screen.getByText('27')).toBeInTheDocument();
  });

  it('auto-calculates 293 kkal in FoodLogModal for Nasi Putih 1,5 piring', async () => {
    const user = userEvent.setup();
    render(
      <FoodLogModal
        isOpen={true}
        date="2026-11-18"
        foods={SAMPLE_FOODS}
        onClose={() => {}}
        onSaved={() => {}}
        onFoodCreated={() => {}}
      />
    );

    await user.click(screen.getByText('Nasi Putih'));
    const qtyInput = screen.getByLabelText(/Jumlah/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '1,5');

    expect(screen.getByText('293')).toBeInTheDocument();
  });

  it('searches Open Food Facts in FoodLogModal Cari Online tab and previews live calories', async () => {
    const user = userEvent.setup();
    vi.mocked(api.searchOpenFoodFacts).mockResolvedValueOnce([
      {
        code: '089686010343',
        name: 'Indomie Goreng',
        brand: 'Indomie',
        image_url: null,
        serving_size: '85 g',
        default_unit: 'bungkus',
        serving_grams: 85,
        calories_per_100g: 464,
        protein_per_100g: 10.8,
        carbs_per_100g: 62.2,
        fat_per_100g: 18.3,
        calories_per_serving: 394,
      },
    ]);

    render(
      <FoodLogModal
        isOpen={true}
        date="2026-11-18"
        foods={SAMPLE_FOODS}
        onClose={() => {}}
        onSaved={() => {}}
        onFoodCreated={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /Cari Online/i }));
    await user.type(screen.getByPlaceholderText(/Cari produk kemasan/i), 'indomie');
    await user.click(screen.getByRole('button', { name: /^Cari$/i }));

    expect(await screen.findByText('Indomie Goreng')).toBeInTheDocument();
    await user.click(screen.getByText('Indomie Goreng'));

    // 1 bungkus (85g) * 464 kcal/100g = 394 kcal
    expect(screen.getByText('394')).toBeInTheDocument();
  });

  it('renders DashboardPage buttons without "+" prefix and shows Sesuai Jalur verdict', () => {
    render(
      <DashboardPage
        dashboard={SAMPLE_DASHBOARD}
        userName="Budi"
        range="7d"
        onRangeChange={() => {}}
        onOpenFoodModal={() => {}}
        onOpenActivityModal={() => {}}
        onOpenWeightModal={() => {}}
        loading={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Catat Makan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catat Aktivitas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catat Berat Badan' })).toBeInTheDocument();
    expect(screen.queryByText(/\+ Catat/)).not.toBeInTheDocument();
    expect(screen.getByText('Sesuai Jalur')).toBeInTheDocument();
  });

  it('shows Admin navigation for admin role, hides it for regular user, and omits "+" on sidebar buttons', () => {
    const { rerender } = render(
      <Layout
        activeTab="dashboard"
        onTabChange={() => {}}
        authUser={ADMIN_USER}
        onLogout={() => {}}
        onQuickFood={() => {}}
        onQuickActivity={() => {}}
        onQuickWeight={() => {}}
        toast={null}
        onDismissToast={() => {}}
      >
        <div>Konten</div>
      </Layout>
    );

    expect(screen.getAllByText('Kelola User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kelola Role').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Log Sistem').length).toBeGreaterThan(0);
    expect(screen.queryByText(/\+ Catat/)).not.toBeInTheDocument();

    rerender(
      <Layout
        activeTab="dashboard"
        onTabChange={() => {}}
        authUser={REGULAR_USER}
        onLogout={() => {}}
        onQuickFood={() => {}}
        onQuickActivity={() => {}}
        onQuickWeight={() => {}}
        toast={null}
        onDismissToast={() => {}}
      >
        <div>Konten</div>
      </Layout>
    );

    expect(screen.queryByText('Kelola User')).not.toBeInTheDocument();
    expect(screen.queryByText('Kelola Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Log Sistem')).not.toBeInTheDocument();
  });
});
