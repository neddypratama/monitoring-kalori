import type {
  ActivityItem,
  ActivityLog,
  AdminUserOverview,
  AdminUserSummary,
  AuditLogItem,
  AuthMeResponse,
  AuthUser,
  DashboardData,
  DashboardRange,
  DayLogsData,
  FoodItem,
  FoodLog,
  OpenFoodFactsProduct,
  ProfileResponse,
  RoleItem,
  WeightLog,
} from '../types';

export function buildApiUrl(route: string, params?: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  search.set('route', route);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        search.set(key, String(value));
      }
    }
  }
  return `./api.php?${search.toString()}`;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  route: string,
  options?: { params?: Record<string, string | number | undefined>; body?: unknown }
): Promise<T> {
  const url = buildApiUrl(route, options?.params);
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: options?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let json: { ok?: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error('Gagal membaca respons server. Pastikan PHP API berjalan.');
  }

  if (!res.ok || !json.ok) {
    throw new Error(json.error || `Permintaan gagal (${res.status}).`);
  }
  return json.data as T;
}

export const api = {
  // Auth
  getMe: () => request<AuthMeResponse>('GET', 'auth/me'),
  login: (body: { username: string; password: string }) => request<{ user: AuthUser }>('POST', 'auth/login', { body }),
  register: (body: { username: string; full_name: string; password: string }) =>
    request<{ user: AuthUser }>('POST', 'auth/register', { body }),
  logout: () => request<{ logged_out: boolean }>('POST', 'auth/logout'),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<{ changed: boolean }>('POST', 'auth/change-password', { body }),

  // Profile & Catalog
  getProfile: () => request<ProfileResponse>('GET', 'profile'),
  saveProfile: (body: Record<string, unknown>) => request<ProfileResponse>('POST', 'profile', { body }),

  getFoods: (params?: { q?: string; category?: string; favorites?: string }) =>
    request<FoodItem[]>('GET', 'foods', { params }),
  createFood: (body: Record<string, unknown>) => request<FoodItem>('POST', 'foods', { body }),
  updateFood: (id: number, body: Record<string, unknown>) =>
    request<FoodItem>('PUT', 'foods', { params: { id }, body }),
  deleteFood: (id: number) => request<{ deleted: boolean; id: number }>('DELETE', 'foods', { params: { id } }),
  toggleFoodFavorite: (id: number) => request<FoodItem>('POST', 'foods/favorite', { params: { id } }),
  searchOpenFoodFacts: (q: string) =>
    request<OpenFoodFactsProduct[]>('GET', 'foods/openfoodfacts', { params: { q } }),

  getActivities: (params?: { q?: string; category?: string; favorites?: string }) =>
    request<ActivityItem[]>('GET', 'activities', { params }),
  createActivity: (body: Record<string, unknown>) => request<ActivityItem>('POST', 'activities', { body }),
  updateActivity: (id: number, body: Record<string, unknown>) =>
    request<ActivityItem>('PUT', 'activities', { params: { id }, body }),
  deleteActivity: (id: number) =>
    request<{ deleted: boolean; id: number }>('DELETE', 'activities', { params: { id } }),
  toggleActivityFavorite: (id: number) => request<ActivityItem>('POST', 'activities/favorite', { params: { id } }),

  // Logs & Dashboard
  getDayLogs: (date: string) => request<DayLogsData>('GET', 'logs/day', { params: { date } }),
  createFoodLog: (body: Record<string, unknown>) => request<FoodLog>('POST', 'food-logs', { body }),
  updateFoodLog: (id: number, body: Record<string, unknown>) =>
    request<FoodLog>('PUT', 'food-logs', { params: { id }, body }),
  deleteFoodLog: (id: number) => request<{ deleted: boolean; id: number }>('DELETE', 'food-logs', { params: { id } }),

  createActivityLog: (body: Record<string, unknown>) => request<ActivityLog>('POST', 'activity-logs', { body }),
  updateActivityLog: (id: number, body: Record<string, unknown>) =>
    request<ActivityLog>('PUT', 'activity-logs', { params: { id }, body }),
  deleteActivityLog: (id: number) =>
    request<{ deleted: boolean; id: number }>('DELETE', 'activity-logs', { params: { id } }),

  getWeightLogs: () => request<WeightLog[]>('GET', 'weight-logs'),
  saveWeightLog: (body: { log_date: string; weight_kg: string | number; notes?: string }) =>
    request<WeightLog>('POST', 'weight-logs', { body }),
  deleteWeightLog: (id: number) =>
    request<{ deleted: boolean; id: number }>('DELETE', 'weight-logs', { params: { id } }),

  getDashboard: (range: DashboardRange, date: string) =>
    request<DashboardData>('GET', 'dashboard', { params: { range, date } }),

  exportAllData: () => request<Record<string, unknown>>('GET', 'export'),

  // Admin RBAC & Audit
  getAdminRoles: () => request<RoleItem[]>('GET', 'admin/roles'),
  createAdminRole: (body: Record<string, unknown>) => request<RoleItem>('POST', 'admin/roles', { body }),
  updateAdminRole: (id: number, body: Record<string, unknown>) =>
    request<RoleItem>('PUT', 'admin/roles', { params: { id }, body }),
  deleteAdminRole: (id: number) => request<{ deleted: boolean; id: number }>('DELETE', 'admin/roles', { params: { id } }),

  getAdminUsers: (date?: string) => request<AdminUserSummary[]>('GET', 'admin/users', { params: { date } }),
  createAdminUser: (body: Record<string, unknown>) => request<AuthUser>('POST', 'admin/users', { body }),
  updateAdminUser: (id: number, body: Record<string, unknown>) =>
    request<AuthUser>('PUT', 'admin/users', { params: { id }, body }),
  deleteAdminUser: (id: number) => request<{ deleted: boolean; id: number }>('DELETE', 'admin/users', { params: { id } }),

  getAdminUserOverview: (userId: number, range: DashboardRange, date: string) =>
    request<AdminUserOverview>('GET', 'admin/user-overview', { params: { user_id: userId, range, date } }),

  getAdminAuditLogs: (params?: { user_id?: number; action?: string; q?: string; limit?: number }) =>
    request<AuditLogItem[]>('GET', 'admin/audit-logs', { params }),
};
