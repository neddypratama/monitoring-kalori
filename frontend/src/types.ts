<<<<<<< HEAD
export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealType = 'sarapan' | 'siang' | 'malam' | 'camilan';
export type ActivityUnit = 'm' | 'km' | 'menit';
export type DashboardRange = '7d' | '14d' | '30d' | 'all';
export type AppTab =
  | 'dashboard'
  | 'logs'
  | 'catalog'
  | 'profile'
  | 'admin-users'
  | 'admin-roles'
  | 'admin-logs';

export interface RolePermissions {
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_all_users_data: boolean;
  can_view_audit_logs: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  role_description: string;
  is_active: boolean;
  permissions: RolePermissions;
  created_at: string;
  updated_at: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_all_users_data: boolean;
  can_view_audit_logs: boolean;
  is_system: boolean;
  user_count: number;
  created_at: string;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  has_profile: boolean;
  latest_weight_kg: number | null;
  goal_type: GoalType | null;
  today_calories_in: number;
  today_calories_burned: number;
  total_food_logs: number;
  total_activity_logs: number;
  total_weight_logs: number;
  created_at: string;
}

export interface AdminUserOverview {
  user: AuthUser;
  has_profile: boolean;
  profile: UserProfile | null;
  dashboard: DashboardData | null;
  recent_food_logs: FoodLog[];
  recent_activity_logs: ActivityLog[];
  recent_weight_logs: WeightLog[];
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  username_snapshot: string;
  actor_full_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  target_user_id: number | null;
  target_username: string | null;
  details: string;
  created_at: string;
}

export interface UserProfile {
  user_id: number;
  name: string;
  gender: Gender;
  age: number;
  height_cm: number;
  initial_weight_kg: number;
  target_weight_kg: number | null;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  daily_calorie_target: number | null;
  is_manual_target: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentMetrics {
  current_weight_kg: number;
  initial_weight_kg: number;
  weight_change_from_start_kg: number;
  bmi: number;
  bmi_category: string;
  bmr: number;
  tdee: number;
  recommended_calorie_target: number;
  active_calorie_target: number;
  is_manual_target: boolean;
}

export interface ProfileResponse {
  exists: boolean;
  profile: UserProfile | null;
  metrics: CurrentMetrics | null;
}

export interface FoodItem {
  id: number;
  user_id?: number | null;
  name: string;
  category: string;
  default_unit: string;
  serving_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  is_custom: boolean;
  is_favorite: boolean;
}

export interface OpenFoodFactsProduct {
  code: string;
  name: string;
  brand: string;
  image_url: string | null;
  serving_size: string;
  default_unit: string;
  serving_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  calories_per_serving: number;
}

export interface ActivityItem {
  id: number;
  user_id?: number | null;
  name: string;
  category: string;
  met: number;
  supports_distance: boolean;
  default_speed_kmh: number | null;
  is_custom: boolean;
  is_favorite: boolean;
}

export interface FoodLog {
  id: number;
  user_id?: number;
  log_date: string;
  meal_type: MealType;
  food_id: number | null;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  log_date: string;
  activity_id: number | null;
  activity_name: string;
  input_value: number;
  input_unit: ActivityUnit;
  duration_minutes: number;
  distance_meters: number | null;
  weight_kg_used: number;
  calories_burned: number;
  notes: string;
  created_at: string;
}

export interface WeightLog {
  id: number;
  user_id?: number;
  log_date: string;
  weight_kg: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  calories_in: number;
  calories_burned: number;
  baseline_tdee: number;
  total_expenditure: number;
  calorie_balance: number;
  daily_target: number;
  remaining_quota: number;
  protein: number;
  carbs: number;
  fat: number;
  weight_on_date: number | null;
  effective_weight: number;
  food_count: number;
  activity_count: number;
}

export interface EvaluationResult {
  status: 'collecting' | 'on_track' | 'faster' | 'slower';
  label: string;
  explanation: string;
  actual_delta_kg: number | null;
  theoretical_delta_kg: number;
  difference_kg: number | null;
  cumulative_balance_kcal: number;
  weight_days: number;
  calorie_days: number;
  start_date: string | null;
  end_date: string | null;
  start_weight_kg: number | null;
  end_weight_kg: number | null;
}

export interface CalorieSeriesPoint {
  date: string;
  calories_in: number;
  calories_burned: number;
  target: number;
  baseline_tdee: number;
  balance: number | null;
}

export interface WeightSeriesPoint {
  date: string;
  actual_weight: number | null;
  moving_avg_7d: number | null;
  projected_weight: number | null;
  target_weight: number | null;
}

export interface DashboardData {
  range: DashboardRange;
  today_summary: DailySummary;
  metrics: CurrentMetrics;
  evaluation: EvaluationResult;
  calorie_series: CalorieSeriesPoint[];
  weight_series: WeightSeriesPoint[];
}

export interface DayLogsData {
  date: string;
  summary: DailySummary;
  food_logs: FoodLog[];
  activity_logs: ActivityLog[];
  weight_log: WeightLog | null;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}
=======
export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type MealType = 'sarapan' | 'siang' | 'malam' | 'camilan';
export type ActivityUnit = 'm' | 'km' | 'menit';
export type DashboardRange = '7d' | '14d' | '30d' | 'all';
export type AppTab =
  | 'dashboard'
  | 'logs'
  | 'catalog'
  | 'profile'
  | 'admin-users'
  | 'admin-roles'
  | 'admin-logs';

export interface RolePermissions {
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_all_users_data: boolean;
  can_view_audit_logs: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  role_description: string;
  is_active: boolean;
  permissions: RolePermissions;
  created_at: string;
  updated_at: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export interface RoleItem {
  id: number;
  name: string;
  description: string;
  can_manage_users: boolean;
  can_manage_roles: boolean;
  can_view_all_users_data: boolean;
  can_view_audit_logs: boolean;
  is_system: boolean;
  user_count: number;
  created_at: string;
}

export interface AdminUserSummary {
  id: number;
  username: string;
  full_name: string;
  role_id: number;
  role_name: string;
  is_active: boolean;
  has_profile: boolean;
  latest_weight_kg: number | null;
  goal_type: GoalType | null;
  today_calories_in: number;
  today_calories_burned: number;
  total_food_logs: number;
  total_activity_logs: number;
  total_weight_logs: number;
  created_at: string;
}

export interface AdminUserOverview {
  user: AuthUser;
  has_profile: boolean;
  profile: UserProfile | null;
  dashboard: DashboardData | null;
  recent_food_logs: FoodLog[];
  recent_activity_logs: ActivityLog[];
  recent_weight_logs: WeightLog[];
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  username_snapshot: string;
  actor_full_name: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  target_user_id: number | null;
  target_username: string | null;
  details: string;
  created_at: string;
}

export interface UserProfile {
  user_id: number;
  name: string;
  gender: Gender;
  age: number;
  height_cm: number;
  initial_weight_kg: number;
  target_weight_kg: number | null;
  activity_level: ActivityLevel;
  goal_type: GoalType;
  daily_calorie_target: number | null;
  is_manual_target: boolean;
  created_at: string;
  updated_at: string;
}

export interface CurrentMetrics {
  current_weight_kg: number;
  initial_weight_kg: number;
  weight_change_from_start_kg: number;
  bmi: number;
  bmi_category: string;
  bmr: number;
  tdee: number;
  recommended_calorie_target: number;
  active_calorie_target: number;
  is_manual_target: boolean;
}

export interface ProfileResponse {
  exists: boolean;
  profile: UserProfile | null;
  metrics: CurrentMetrics | null;
}

export interface FoodItem {
  id: number;
  user_id?: number | null;
  name: string;
  category: string;
  default_unit: string;
  serving_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  is_custom: boolean;
  is_favorite: boolean;
}

export interface OpenFoodFactsProduct {
  code: string;
  name: string;
  brand: string;
  image_url: string | null;
  serving_size: string;
  default_unit: string;
  serving_grams: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  calories_per_serving: number;
}

export interface ActivityItem {
  id: number;
  user_id?: number | null;
  name: string;
  category: string;
  met: number;
  supports_distance: boolean;
  default_speed_kmh: number | null;
  is_custom: boolean;
  is_favorite: boolean;
}

export interface FoodLog {
  id: number;
  user_id?: number;
  log_date: string;
  meal_type: MealType;
  food_id: number | null;
  food_name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id?: number;
  log_date: string;
  activity_id: number | null;
  activity_name: string;
  input_value: number;
  input_unit: ActivityUnit;
  duration_minutes: number;
  distance_meters: number | null;
  weight_kg_used: number;
  calories_burned: number;
  notes: string;
  created_at: string;
}

export interface WeightLog {
  id: number;
  user_id?: number;
  log_date: string;
  weight_kg: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  date: string;
  calories_in: number;
  calories_burned: number;
  baseline_tdee: number;
  total_expenditure: number;
  calorie_balance: number;
  daily_target: number;
  remaining_quota: number;
  protein: number;
  carbs: number;
  fat: number;
  weight_on_date: number | null;
  effective_weight: number;
  food_count: number;
  activity_count: number;
}

export interface EvaluationResult {
  status: 'collecting' | 'on_track' | 'faster' | 'slower';
  label: string;
  explanation: string;
  actual_delta_kg: number | null;
  theoretical_delta_kg: number;
  difference_kg: number | null;
  cumulative_balance_kcal: number;
  weight_days: number;
  calorie_days: number;
  start_date: string | null;
  end_date: string | null;
  start_weight_kg: number | null;
  end_weight_kg: number | null;
}

export interface CalorieSeriesPoint {
  date: string;
  calories_in: number;
  calories_burned: number;
  target: number;
  baseline_tdee: number;
  balance: number | null;
}

export interface WeightSeriesPoint {
  date: string;
  actual_weight: number | null;
  moving_avg_7d: number | null;
  projected_weight: number | null;
  target_weight: number | null;
}

export interface DashboardData {
  range: DashboardRange;
  today_summary: DailySummary;
  metrics: CurrentMetrics;
  evaluation: EvaluationResult;
  calorie_series: CalorieSeriesPoint[];
  weight_series: WeightSeriesPoint[];
}

export interface DayLogsData {
  date: string;
  summary: DailySummary;
  food_logs: FoodLog[];
  activity_logs: ActivityLog[];
  weight_log: WeightLog | null;
}

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}
>>>>>>> 14f90995ced414a546f88517b9802fe68493c8b9
