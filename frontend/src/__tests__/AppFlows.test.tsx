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
    analyzeFoodPhoto: vi.fn(),
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

    // Verify show/hide password toggle works
    const passInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    expect(passInput.type).toBe('password');
    await user.click(screen.getByRole('button', { name: /Tampilkan password/i }));
    expect(passInput.type).toBe('text');
    await user.click(screen.getByRole('button', { name: /Sembunyikan password/i }));
    expect(passInput.type).toBe('password');

    await user.type(screen.getByLabelText(/Username/i), 'admin');
    await user.type(passInput, 'admin123');
    await user.click(screen.getByRole('button', { name: /^Masuk$/i }));

    expect(await screen.findByText(/Selamat Datang di KaloriKu/i)).toBeInTheDocument();
  });

  it('shows pending admin activation notice on register without auto-logging in', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getMe).mockResolvedValueOnce({ authenticated: false, user: null });
    vi.mocked(api.register).mockResolvedValueOnce({
      user: { ...REGULAR_USER, is_active: false },
      pending_activation: true,
      message: 'Pendaftaran berhasil! Akun Anda belum aktif dan sedang menunggu aktivasi dari Admin.',
    });

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /Daftar Baru/i }));
    expect(screen.getByText(/berstatus Belum Aktif/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Nama Lengkap/i), 'Siti Rahma');
    await user.type(screen.getByLabelText(/Username/i), 'siti');
    await user.type(screen.getByLabelText(/^Password$/i), 'rahasia123');
    await user.type(screen.getByLabelText(/Ulangi Password/i), 'rahasia123');
    await user.click(screen.getByRole('button', { name: /Daftar Akun/i }));

    expect(await screen.findByText(/menunggu aktivasi dari Admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/Selamat Datang di KaloriKu/i)).not.toBeInTheDocument();
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

  it('analyzes a food photo in FoodLogModal Foto AI tab and batch-saves checked items', async () => {
    const user = userEvent.setup();
    vi.mocked(api.analyzeFoodPhoto).mockResolvedValueOnce({
      meal_summary: 'Nasi Putih dengan Ayam Goreng',
      confidence: 'tinggi',
      notes: 'Estimasi porsi standar warteg.',
      total_calories: 520,
      total_protein: 32.5,
      total_carbs: 55.0,
      total_fat: 18.0,
      items: [
        {
          name: 'Nasi Putih',
          unit: 'piring',
          quantity: 1,
          estimated_grams: 150,
          calories: 200,
          protein: 4.0,
          carbs: 44.0,
          fat: 0.5,
        },
        {
          name: 'Ayam Goreng Paha',
          unit: 'potong',
          quantity: 1,
          estimated_grams: 120,
          calories: 320,
          protein: 28.5,
          carbs: 11.0,
          fat: 17.5,
        },
      ],
    });
    vi.mocked(api.createFoodLog).mockResolvedValue({
      id: 99,
      log_date: '2026-11-18',
      meal_type: 'siang',
      food_id: null,
      food_name: 'Nasi Putih',
      quantity: 1,
      unit: 'piring',
      calories: 200,
      protein: 4,
      carbs: 44,
      fat: 0.5,
      notes: '',
      created_at: '2026-11-18',
    });

    const onSaved = vi.fn();
    render(
      <FoodLogModal
        isOpen={true}
        date="2026-11-18"
        foods={SAMPLE_FOODS}
        onClose={() => {}}
        onSaved={onSaved}
        onFoodCreated={() => {}}
      />
    );

    await user.click(screen.getByRole('button', { name: /Foto AI/i }));
    expect(screen.getByRole('button', { name: /Analisis Foto Dulu/i })).toBeDisabled();
    const fileInput = screen.getByLabelText(/Upload Foto Makanan/i);
    const fakeFile = new File(['fake-jpeg-bytes'], 'makan-siang.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, fakeFile);

    expect(await screen.findByText(/Foto berhasil dimuat/i)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Analisis Foto AI/i }));

    expect(await screen.findByText('Nasi Putih dengan Ayam Goreng')).toBeInTheDocument();
    expect(screen.getByText(/Analisis selesai/i)).toBeInTheDocument();
    expect(screen.getByText('520')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Simpan \(2\) dari Foto/i }));

    await waitFor(() => {
      expect(api.createFoodLog).toHaveBeenCalledTimes(2);
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
  });

  it('renders DashboardPage buttons without "+" prefix, Diet Duration Balance Card, and Sesuai Jalur verdict', () => {
    const dashWithPlan: DashboardData = {
      ...SAMPLE_DASHBOARD,
      metrics: {
        ...SAMPLE_DASHBOARD.metrics,
        diet_plan: {
          direction: 'lose',
          duration_days: 90,
          start_date: '2026-11-09',
          target_end_date: '2027-02-06',
          days_elapsed: 10,
          days_remaining: 80,
          effective_days: 80,
          weight_diff_kg: -4.5,
          total_calories_needed: 34650,
          daily_gap_kcal: 433,
          weekly_rate_kg: 0.39,
          suggested_food_calories: 1684,
          suggested_exercise_burn: 152,
          is_aggressive: false,
          recommended_min_days: 42,
          walk_min_equiv: 29,
          walk_km_equiv: 2.9,
          jog_min_equiv: 15,
          advice: 'Kombinasikan makan sekitar 1.684 kkal/hari dan bakar sekitar 152 kkal/hari lewat olahraga.',
        },
      },
    };
    render(
      <DashboardPage
        dashboard={dashWithPlan}
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
    expect(screen.getByText(/Hari ke-10 dari 90 • Sisa 80 hari/i)).toBeInTheDocument();
    expect(screen.getByText(/Saran Bakar Olahraga/i)).toBeInTheDocument();
  });

  it('shows Admin navigation (including Pengaturan AI) for admin role, hides it for regular user, and omits "+" on sidebar buttons', () => {
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
    expect(screen.getAllByText('Pengaturan AI').length).toBeGreaterThan(0);
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
    expect(screen.queryByText('Pengaturan AI')).not.toBeInTheDocument();
  });

  it('opens InstallAppModal with Android APK download link and iPhone Safari guide', async () => {
    const user = userEvent.setup();
    render(
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

    const installTrigger = screen.getByRole('button', { name: /Pasang \/ Download App/i });
    expect(installTrigger).toBeInTheDocument();
    await user.click(installTrigger);

    expect(screen.getByRole('heading', { name: /Pasang Aplikasi KaloriKu/i })).toBeInTheDocument();
    expect(screen.getByText(/Download File KaloriKu.apk/i)).toBeInTheDocument();

    const apkLink = screen.getByRole('link', { name: /Download File KaloriKu.apk/i });
    expect(apkLink).toHaveAttribute('href', '/downloads/KaloriKu.apk');

    // Switch to iPhone tab
    const iosTab = screen.getByRole('button', { name: /iPhone \(iOS\)/i });
    await user.click(iosTab);
    expect(screen.getByText(/Catatan untuk Pengguna iPhone & iPad/i)).toBeInTheDocument();
    expect(screen.getByText(/Tambah ke Layar Utama/i)).toBeInTheDocument();
  });
});
