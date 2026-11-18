# Sistem Monitoring Kalori & Program Diet ("KaloriKu") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-config, web-based personal calorie & diet monitoring application ("KaloriKu") with automatic food/activity calorie calculation (including distance-based inputs like walking 500 m), daily weight tracking, and an interactive calorie-vs-weight correlation dashboard.

**Architecture:** Lightweight PHP 8.3 JSON REST API (`api.php?route=...`) backed by auto-initializing SQLite (`storage/monitoring_kalori.sqlite`) paired with a React + TypeScript + Tailwind CSS + Recharts frontend built with Vite (`base: './'`) into `public/` and served by `index.php`. Runs directly in Laragon (`http://monitoring-kalori.test/` or `http://localhost/monitoring-kalori/`) or `php -S` with zero external services or MySQL setup.

**Tech Stack:** PHP 8.3 (`pdo_sqlite`), SQLite 3, Node.js 22, React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-18-monitoring-kalori-design.md`

## Global Constraints

- Runs directly in Laragon (`c:\laragon\www\monitoring-kalori`) on PHP 8.3 with `pdo_sqlite` and Node.js 22 without requiring MySQL, `.htaccess` rewrite rules, or paid external API keys.
- All user-facing UI copy, labels, categories, validation messages, and evaluation explanations MUST be in natural, consistent Bahasa Indonesia.
- Single-user personal mode (no authentication/login screens); SQLite database lives at `storage/monitoring_kalori.sqlite` and auto-migrates + seeds on first request.
- All API calls use relative `./api.php?route=...` and Vite uses `base: './'` so root vhost (`http://monitoring-kalori.test/`) and subdirectory (`http://localhost/monitoring-kalori/`) URLs work identically.
- Formulas pinned by spec: BMI Kemenkes RI (`<18.5`, `18.5–25.0`, `25.1–27.0`, `>27.0`); BMR Mifflin-St Jeor; TDEE multipliers (`1.2`, `1.375`, `1.55`, `1.725`); safe calorie floor (`1200` female / `1500` male); MET formula `round(MET * 3.5 * weight_kg / 200 * minutes)`; theoretical weight delta `cumulative_balance / 7700`; evaluation threshold `±0.5 kg`; minimum `3` weight days and `3` calorie days inside `[start_weight_date, end_weight_date]`.

## Review Focus

- **Indonesian decimal comma inputs (`"68,5"`, `"1,5"`, `"0,5"`):** Users type commas for decimals; frontend number parsers and backend numeric validators must accept commas and convert cleanly to floats instead of producing `NaN` or truncating (pinned in Tasks 1 & 5).
- **Invalid activity unit or non-positive values (`"Yoga 500 m"`, `0`, `-5`):** Submitting distance units (`m`/`km`) for an activity with `supports_distance = 0`, or zero/negative quantity/weight/height, must return HTTP 400 with a clear Indonesian error—never divide by zero or store negative calories (pinned in Tasks 1 & 4).
- **Catalog mutation vs historical log immutability:** Editing or deleting a custom food/activity must preserve previously recorded snapshots in `food_logs` / `activity_logs` (`ON DELETE SET NULL`) and deleting built-in seed items must be rejected with HTTP 400 (pinned in Task 4).
- **Same-day duplicate weight check-in & backdated weight logs:** Logging weight twice on the same date must upsert the single daily row without a UNIQUE constraint error, and backdated weight entries must update historical TDEE carry-forward and evaluation trends (pinned in Tasks 3 & 4).
- **Subdirectory & vhost URL compatibility (`./api.php?route=...` and `base: './'`):** Built assets in `public/` and frontend API requests must contain no hardcoded root-absolute `/api` or `/assets` paths so Laragon subdirectory hosting works identically to virtual hosts (pinned in Tasks 5 & 7).

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `.gitignore` | Ignores `node_modules/`, `storage/*.sqlite*`, IDE files |
| `index.php` | Serves built SPA from `public/index.html` |
| `api.php` | HTTP JSON bootstrapper connecting `Database` and `Router` |
| `backend/Calculators.php` | Pure domain math (BMI, BMR, TDEE, target calories, food macros, MET distance/duration calories, decimal parsing) |
| `backend/Database.php` | SQLite PDO factory, schema migration (`6` tables), idempotent seed trigger |
| `backend/SeedData.php` | Curated ≥120 Indonesian/common foods & ≥25 MET-based activities |
| `backend/AnalyticsService.php` | Dynamic carry-forward TDEE, daily summaries, calorie-vs-weight correlation, 7-day moving average, anchored theoretical weight series |
| `backend/Router.php` | Route dispatcher & CRUD handlers for profile, foods, activities, food logs, activity logs, weight logs, dashboard, export |
| `tests/php/Assert.php` | Minimal zero-dependency PHP CLI test assertion runner |
| `tests/php/CalculatorsTest.php` | Unit tests for all domain math & edge cases |
| `tests/php/DatabaseSeedTest.php` | Tests SQLite migration, idempotency, seed catalog size & invariants |
| `tests/php/AnalyticsServiceTest.php` | Tests carry-forward TDEE, date-window alignment, evaluation verdicts, chart alignment |
| `tests/php/RouterApiTest.php` | End-to-end API contract tests against SQLite |
| `frontend/vite.config.ts` | Vite config (`base: './'`, build output `../public`, PHP dev proxy) |
| `frontend/src/types.ts` | TypeScript interfaces matching PHP JSON responses |
| `frontend/src/api/client.ts` | Relative `./api.php?route=...` typed HTTP client |
| `frontend/src/utils/calculators.ts` | Client-side real-time preview calculators & Indonesian decimal parser |
| `frontend/src/components/Layout.tsx` | Responsive desktop sidebar + mobile bottom nav + toast feedback |
| `frontend/src/components/OnboardingView.tsx` | First-time profile wizard with live BMI/BMR/TDEE preview |
| `frontend/src/components/QuickLogModals.tsx` | Fast modals for food log, activity log (`m`/`km`/`menit`), and weight log |
| `frontend/src/pages/DashboardPage.tsx` | Today hero cards, diet evaluation card, Recharts weight & calorie charts |
| `frontend/src/pages/DailyLogPage.tsx` | Date navigator, meal-grouped food list, activity list, daily weight card |
| `frontend/src/pages/CatalogPage.tsx` | Search/filter/favorite/CRUD custom foods & activities |
| `frontend/src/pages/ProfilePage.tsx` | Profile/target editor, weight history table, JSON backup export |
| `frontend/src/App.tsx` | Root state bootstrap, onboarding gate, tab router, modal coordinator |
| `frontend/src/__tests__/calculators.test.ts` | Vitest unit tests for client preview formulas & comma decimals |
| `frontend/src/__tests__/AppFlows.test.tsx` | Vitest + RTL tests for onboarding, food/activity auto-calc modals, dashboard |

---

### Task 1: Core Domain Calculators & PHP Test Harness

**Files:**
- Create: `.gitignore`
- Create: `tests/php/Assert.php`
- Create: `tests/php/CalculatorsTest.php`
- Create: `backend/Calculators.php`

**Interfaces:**
- Consumes: none
- Produces:
  - `Calculators::parseNumber(mixed $value): ?float` (accepts numeric strings with `,` or `.`, returns `null` if invalid)
  - `Calculators::calculateBmi(float $weightKg, float $heightCm): array` → `['bmi' => float, 'category' => string]`
  - `Calculators::calculateBmr(float $weightKg, float $heightCm, int $age, string $gender): float`
  - `Calculators::calculateTdee(float $bmr, string $activityLevel): float` (`sedentary`|`light`|`moderate`|`active`)
  - `Calculators::calculateRecommendedCalories(float $tdee, string $goalType, string $gender): int` (`lose`|`maintain`|`gain`)
  - `Calculators::calculateFoodNutrition(array $food, float $quantity, string $unit): array` → `['calories' => int, 'protein' => float, 'carbs' => float, 'fat' => float]`
  - `Calculators::calculateActivityCalories(array $activity, float $inputValue, string $inputUnit, float $weightKg): array` → `['calories_burned' => int, 'duration_minutes' => float, 'distance_meters' => ?float]`

- [ ] **Step 1: Initialize git repo (if not yet initialized) and create `tests/php/Assert.php` + failing `tests/php/CalculatorsTest.php`**

`tests/php/Assert.php` exports a lightweight `TestRunner` class (`test(string $name, callable $fn)`, `assertEquals`, `assertApprox`, `assertTrue`, `assertThrows`, `summary(): int` exiting `1` on any failure).

`tests/php/CalculatorsTest.php` asserts:
```php
// Decimal comma parsing (Review Focus #1)
Assert::equals(68.5, Calculators::parseNumber('68,5'));
Assert::equals(0.5, Calculators::parseNumber('0.5'));
Assert::equals(null, Calculators::parseNumber('abc'));

// BMI Kemenkes RI boundaries
Assert::equals(['bmi' => 18.4, 'category' => 'Berat Badan Kurang'], Calculators::calculateBmi(53.2, 170));
Assert::equals(['bmi' => 24.2, 'category' => 'Normal'], Calculators::calculateBmi(70.0, 170));
Assert::equals(['bmi' => 26.0, 'category' => 'Gemuk Ringan'], Calculators::calculateBmi(75.1, 170));
Assert::equals(['bmi' => 27.7, 'category' => 'Obesitas'], Calculators::calculateBmi(80.0, 170));

// BMR Mifflin-St Jeor & TDEE & safe floor
Assert::approx(1648.75, Calculators::calculateBmr(70, 170, 25, 'male'), 0.01);
Assert::approx(1482.75, Calculators::calculateBmr(70, 170, 25, 'female'), 0.01);
Assert::approx(1978.5, Calculators::calculateTdee(1648.75, 'sedentary'), 0.01);
Assert::equals(1500, Calculators::calculateRecommendedCalories(1800, 'lose', 'male'));
Assert::equals(1200, Calculators::calculateRecommendedCalories(1500, 'lose', 'female'));
Assert::equals(2279, Calculators::calculateRecommendedCalories(1978.5, 'gain', 'male'));

// Food nutrition: gram vs default_unit
$nasi = ['default_unit' => 'piring', 'serving_grams' => 150, 'calories_per_100g' => 130, 'protein_per_100g' => 2.7, 'carbs_per_100g' => 28.0, 'fat_per_100g' => 0.3];
Assert::equals(['calories' => 195, 'protein' => 4.1, 'carbs' => 42.0, 'fat' => 0.5], Calculators::calculateFoodNutrition($nasi, 1.0, 'piring'));
Assert::equals(['calories' => 130, 'protein' => 2.7, 'carbs' => 28.0, 'fat' => 0.3], Calculators::calculateFoodNutrition($nasi, 100.0, 'gram'));

// Activity: walking 500 m at 70 kg (~27 kcal), km, and minutes
$jalan = ['met' => 3.3, 'supports_distance' => 1, 'default_speed_kmh' => 4.5];
$res500m = Calculators::calculateActivityCalories($jalan, 500, 'm', 70);
Assert::equals(27, $res500m['calories_burned']);
Assert::approx(6.67, $res500m['duration_minutes'], 0.05);
Assert::equals(500.0, $res500m['distance_meters']);

$res2km = Calculators::calculateActivityCalories($jalan, 2.0, 'km', 70);
Assert::equals(108, $res2km['calories_burned']);
Assert::equals(2000.0, $res2km['distance_meters']);

// Activity invalid unit / non-positive value (Review Focus #2)
$yoga = ['met' => 3.0, 'supports_distance' => 0, 'default_speed_kmh' => null];
Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateActivityCalories($yoga, 500, 'm', 70));
Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateActivityCalories($jalan, 0, 'm', 70));
Assert::throws(InvalidArgumentException::class, fn() => Calculators::calculateFoodNutrition($nasi, -1, 'piring'));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php tests/php/CalculatorsTest.php`  
Expected: FAIL because `backend/Calculators.php` does not exist.

- [ ] **Step 3: Implement `backend/Calculators.php`**

Implement all 7 static methods in `Calculators` matching the spec formulas exactly, validating positive numbers, valid gender/activity_level/goal_type/units, and throwing `InvalidArgumentException` with clear Indonesian messages on invalid inputs. Round BMI to 1 decimal, macros to 1 decimal, calories to nearest integer, duration to 2 decimals.

- [ ] **Step 4: Run test to verify it passes**

Run: `php tests/php/CalculatorsTest.php`  
Expected: PASS (all assertions green, exit code 0).

- [ ] **Step 5: Commit**

```bash
git init
git add .gitignore tests/php/Assert.php tests/php/CalculatorsTest.php backend/Calculators.php
git commit -m "feat: add core calorie and diet calculators with unit tests"
```

---

### Task 2: SQLite Database Schema & Curated Indonesian Food/Activity Seed Catalog

**Files:**
- Create: `backend/SeedData.php`
- Create: `backend/Database.php`
- Create: `tests/php/DatabaseSeedTest.php`

**Interfaces:**
- Consumes: none
- Produces:
  - `Database::connect(?string $dbPath = null): PDO` (defaults to `<root>/storage/monitoring_kalori.sqlite`, creates parent dir if needed, enables `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL`, runs `migrate($pdo)` and `SeedData::seedIfEmpty($pdo)`)
  - `Database::migrate(PDO $pdo): void` (creates `user_profile`, `foods`, `activities`, `food_logs`, `activity_logs`, `weight_logs` with `ON DELETE SET NULL` on `food_logs.food_id` and `activity_logs.activity_id`, and `UNIQUE` on `weight_logs.log_date`)
  - `SeedData::foods(): array` (≥120 Indonesian & common foods across 7 categories: `Makanan Pokok`, `Lauk`, `Sayur`, `Masakan Jadi`, `Buah`, `Minuman`, `Camilan`)
  - `SeedData::activities(): array` (≥25 activities across 5 categories: `Jalan & Lari`, `Kardio`, `Kekuatan`, `Olahraga Permainan`, `Aktivitas Harian`)
  - `SeedData::seedIfEmpty(PDO $pdo): void` (idempotent: only seeds `foods` when `COUNT(*) = 0`, and `activities` when `COUNT(*) = 0`)

- [ ] **Step 1: Write failing `tests/php/DatabaseSeedTest.php`**

Assert using a temp SQLite file (cleaned up after test):
- All 6 tables (`user_profile`, `foods`, `activities`, `food_logs`, `activity_logs`, `weight_logs`) exist.
- `foods` count is `>= 120`, covers all 7 required categories, includes essential Indonesian foods (`Nasi Putih`, `Nasi Goreng`, `Ayam Goreng`, `Tempe Goreng`, `Bakso Sapi`, `Es Teh Manis`), and every row has `serving_grams > 0`, `calories_per_100g >= 0`, `is_custom = 0`.
- `activities` count is `>= 25`, covers all 5 required categories, includes `Jalan Santai` (`supports_distance = 1`, `default_speed_kmh = 4.5`, `met = 3.3`), `Jalan Cepat`, `Jogging / Lari Santai`, `Bersepeda Santai`, `Yoga` (`supports_distance = 0`), and every `supports_distance = 1` row has `default_speed_kmh > 0`.
- Calling `Database::connect($tempPath)` a second time does NOT duplicate rows (idempotent).

- [ ] **Step 2: Run test to verify it fails**

Run: `php tests/php/DatabaseSeedTest.php`  
Expected: FAIL because `backend/Database.php` and `backend/SeedData.php` do not exist.

- [ ] **Step 3: Implement `backend/SeedData.php` and `backend/Database.php`**

Author accurate TKPI/USDA-aligned Indonesian food nutrition values (≥120 distinct items with natural Indonesian names and everyday `default_unit` like `piring`, `mangkok`, `porsi`, `potong`, `butir`, `gelas`, `buah`, `bungkus`, `sdm`) and Compendium-of-Physical-Activities MET values (≥25 activities). Implement `Database::connect` and `Database::migrate` matching the 6-table schema from spec §5 verbatim, including `is_manual_target INTEGER NOT NULL DEFAULT 0` on `user_profile`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php tests/php/DatabaseSeedTest.php`  
Expected: PASS (all assertions green, exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/SeedData.php backend/Database.php tests/php/DatabaseSeedTest.php
git commit -m "feat: add SQLite schema migration and Indonesian food/activity seed catalog"
```

---

### Task 3: Analytics & Calorie-vs-Weight Correlation Engine

**Files:**
- Create: `backend/AnalyticsService.php`
- Create: `tests/php/AnalyticsServiceTest.php`

**Interfaces:**
- Consumes: `Calculators::*`, `PDO` from `Database::connect`
- Produces:
  - `AnalyticsService::getEffectiveWeightForDate(PDO $pdo, string $date, float $fallbackWeight): float`
  - `AnalyticsService::getCurrentMetrics(PDO $pdo, array $profile, ?string $asOfDate = null): array` → `['current_weight_kg', 'bmi', 'bmi_category', 'bmr', 'tdee', 'recommended_calorie_target', 'active_calorie_target']`
  - `AnalyticsService::getDailySummary(PDO $pdo, array $profile, string $date): array` → `['date', 'calories_in', 'calories_burned', 'baseline_tdee', 'total_expenditure', 'calorie_balance', 'daily_target', 'remaining_quota', 'protein', 'carbs', 'fat', 'weight_on_date', 'effective_weight', 'food_count', 'activity_count']`
  - `AnalyticsService::getDashboardData(PDO $pdo, array $profile, string $range = '7d', ?string $today = null): array` → `['range', 'today_summary', 'metrics', 'evaluation', 'calorie_series', 'weight_series']`
    - `evaluation` keys: `status` (`collecting`|`on_track`|`faster`|`slower`), `label`, `explanation`, `actual_delta_kg`, `theoretical_delta_kg`, `difference_kg`, `cumulative_balance_kcal`, `weight_days`, `calorie_days`, `start_date`, `end_date`, `start_weight_kg`, `end_weight_kg`
    - `calorie_series` items: `['date', 'calories_in', 'calories_burned', 'target', 'baseline_tdee', 'balance']`
    - `weight_series` items: `['date', 'actual_weight', 'moving_avg_7d', 'projected_weight', 'target_weight']`

- [ ] **Step 1: Write failing `tests/php/AnalyticsServiceTest.php`**

Cover all spec §4.1 & §4.4 rules plus Review Focus #4:
1. **Dynamic weight carry-forward & backdating:** Profile `initial_weight_kg = 80`, `height = 170`, `age = 30`, `male`, `sedentary`. Insert weight `75` on `2026-11-10` and backdated `78` on `2026-11-05`. Assert `getEffectiveWeightForDate('2026-11-04') === 80.0`, `('2026-11-06') === 78.0`, `('2026-11-12') === 75.0`, and daily `baseline_tdee` on `2026-11-12` uses `75 kg` while `2026-11-06` uses `78 kg`.
2. **`< 3` days gating (`collecting`):** With only 2 weight logs or only 2 food-logged days inside `[start_weight_date, end_weight_date]`, assert `evaluation['status'] === 'collecting'` and `label === 'Mengumpulkan Data'`.
3. **Date-window alignment & skipping unlogged days:** Over a 14-day window where food is logged on days 1–14, but weights are logged only on days 5, 8, and 11 (3 weigh-ins): assert `evaluation['calorie_days']` counts ONLY food-logged days within `[day5, day11]` (excluding days 1–4 and 12–14), and days with zero food logs do not contribute phantom deficit.
4. **All 3 verdict bands:**
   - `on_track` (`|actual - theoretical| <= 0.5 kg`) → `'Sesuai Jalur'`
   - `faster` (`actual < theoretical - 0.5 kg`) → `'Turun Lebih Cepat dari Estimasi'`
   - `slower` (`actual > theoretical + 0.5 kg`) → `'Lebih Lambat dari Estimasi'`
5. **Chart vs Evaluation card consistency:** Assert the first non-null `projected_weight` in `weight_series` starts at `start_weight_date` with `start_weight_kg`, and `projected_weight` at `end_weight_date` equals `round(start_weight_kg + theoretical_delta_kg, 2)`.
6. **7-day moving average:** With ≥3 weight points, verify `moving_avg_7d` averages available weigh-ins in the trailing 7-day window.

- [ ] **Step 2: Run test to verify it fails**

Run: `php tests/php/AnalyticsServiceTest.php`  
Expected: FAIL because `backend/AnalyticsService.php` does not exist.

- [ ] **Step 3: Implement `backend/AnalyticsService.php`**

Implement date-window resolution (`7d`, `14d`, `30d`, `all`), carry-forward weight lookup, daily summaries, calorie-vs-weight correlation strictly scoped to `[start_weight_date, end_weight_date]`, anchored theoretical projection series, and 7-day moving average.

- [ ] **Step 4: Run test to verify it passes**

Run: `php tests/php/AnalyticsServiceTest.php`  
Expected: PASS (all assertions green, exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/AnalyticsService.php tests/php/AnalyticsServiceTest.php
git commit -m "feat: add analytics engine for dynamic TDEE and calorie-weight correlation"
```

---

### Task 4: PHP JSON API Router & Laragon Entry Points

**Files:**
- Create: `backend/Router.php`
- Create: `api.php`
- Create: `index.php`
- Create: `tests/php/RouterApiTest.php`

**Interfaces:**
- Consumes: `Database::connect`, `Calculators::*`, `AnalyticsService::*`
- Produces:
  - `Router::handle(PDO $pdo, string $method, string $route, array $query, array $body): array` → `['status' => int, 'payload' => ['ok' => bool, 'data' => mixed, 'error' => ?string]]`
  - Supported routes:
    - `GET profile`, `POST profile`
    - `GET foods`, `POST foods`, `PUT foods`, `DELETE foods`, `POST foods/favorite`
    - `GET activities`, `POST activities`, `PUT activities`, `DELETE activities`, `POST activities/favorite`
    - `GET logs/day` (`?date=YYYY-MM-DD`)
    - `POST food-logs`, `PUT food-logs`, `DELETE food-logs`
    - `POST activity-logs`, `PUT activity-logs`, `DELETE activity-logs`
    - `GET weight-logs`, `POST weight-logs`, `DELETE weight-logs`
    - `GET dashboard` (`?range=7d|14d|30d|all&date=YYYY-MM-DD`)
    - `GET export`

- [ ] **Step 1: Write failing `tests/php/RouterApiTest.php`**

Test full API contract through `Router::handle` against a temp SQLite DB:
1. `GET profile` before onboarding returns `200` with `data.exists === false`.
2. `POST profile` creates profile (`initial_weight_kg: "70,5"`, `height_cm: 170`, `age: 26`, `gender: "male"`, `activity_level: "sedentary"`, `goal_type: "lose"`, `target_weight_kg: 65`) AND auto-creates initial `weight_logs` row for today (`70.5`).
3. `POST food-logs` with catalog `food_id` (Nasi Putih, `quantity: "1,5"`, `unit: "piring"`) auto-computes calories & macros; also test manual entry (`food_id: null`, `food_name: "Kopi Susu Gula Aren"`, `calories: 180`).
4. **Snapshot immutability & built-in delete guard (Review Focus #3):** Create custom food → log it → update & then delete the custom food → verify existing `food_logs` row still retains its original `food_name` and `calories` (`food_id` becomes `null`). Attempting `DELETE foods` on a built-in (`is_custom = 0`) item returns HTTP `400`.
5. `POST activity-logs` with `Jalan Santai`, `input_value: 500`, `input_unit: "m"` auto-calculates burned calories using current weight (`70.5 kg`); sending `Yoga` with `input_unit: "m"` returns HTTP `400` (Review Focus #2).
6. **Weight upsert (Review Focus #4):** `POST weight-logs` twice on the same `log_date` updates the existing row (returns `200` and count of rows for that date remains `1`).
7. `GET dashboard?range=7d`, `GET logs/day`, and `GET export` return expected shapes with `ok === true`.

- [ ] **Step 2: Run test to verify it fails**

Run: `php tests/php/RouterApiTest.php`  
Expected: FAIL because `backend/Router.php` does not exist.

- [ ] **Step 3: Implement `backend/Router.php`, `api.php`, and `index.php`**

- `backend/Router.php`: Clean route table with input validation (using `Calculators::parseNumber`), prepared SQLite statements, snapshot saving on food/activity logs, built-in catalog delete guard, and Indonesian error messages.
- `api.php`: Sets `Content-Type: application/json; charset=utf-8`, handles `OPTIONS` preflight (for local Vite dev), parses JSON body & `$_GET['route']`, invokes `Router::handle`, outputs HTTP status + JSON.
- `index.php`: Serves `public/index.html` if present, otherwise returns a clear Indonesian HTML notice instructing to run `npm run build` in `frontend/`.

- [ ] **Step 4: Run full PHP test suite**

Run: `php tests/php/CalculatorsTest.php && php tests/php/DatabaseSeedTest.php && php tests/php/AnalyticsServiceTest.php && php tests/php/RouterApiTest.php`  
Expected: All 4 PHP test files PASS (exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/Router.php api.php index.php tests/php/RouterApiTest.php
git commit -m "feat: add PHP JSON API router and Laragon entry points"
```

---

### Task 5: Frontend Scaffold, API Client, Live Preview Calculators, Shell & Onboarding

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/index.html`
- Create: `frontend/src/index.css`, `frontend/src/main.tsx`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/utils/calculators.ts`
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/OnboardingView.tsx`
- Create: `frontend/src/__tests__/calculators.test.ts`

**Interfaces:**
- Consumes: PHP API contract (`./api.php?route=...`) from Task 4
- Produces:
  - `frontend/src/types.ts`: `UserProfile`, `CurrentMetrics`, `FoodItem`, `ActivityItem`, `FoodLog`, `ActivityLog`, `WeightLog`, `DailySummary`, `EvaluationResult`, `DashboardData`, `DayLogsData`
  - `frontend/src/api/client.ts`: `api` object (`getProfile`, `saveProfile`, `getFoods`, `createFood`, `updateFood`, `deleteFood`, `toggleFoodFavorite`, `getActivities`, `createActivity`, `updateActivity`, `deleteActivity`, `toggleActivityFavorite`, `getDayLogs`, `createFoodLog`, `updateFoodLog`, `deleteFoodLog`, `createActivityLog`, `updateActivityLog`, `deleteActivityLog`, `getWeightLogs`, `saveWeightLog`, `deleteWeightLog`, `getDashboard`, `exportAllData`)
  - `frontend/src/utils/calculators.ts`: `parseDecimalInput`, `previewProfileMetrics`, `previewFoodNutrition`, `previewActivityCalories`, `formatDateId`, `getLocalDateIso`
  - `Layout` component (`activeTab`, `onTabChange`, `onQuickAction`, `toast`, `children`)
  - `OnboardingView` component (`onComplete(profile)`)

- [ ] **Step 1: Scaffold `frontend/` with Vite + React + TypeScript + Tailwind CSS + Recharts + Lucide + Vitest**

Create `frontend/package.json`, `frontend/vite.config.ts` (`base: './'`, `build.outDir: '../public'`, `build.emptyOutDir: true`, dev proxy `'/api.php'` -> `'http://127.0.0.1:8000'`, Vitest jsdom config), `frontend/tsconfig.json`, `frontend/index.html` (Indonesian title `"KaloriKu — Monitoring Kalori & Program Diet"`, Plus Jakarta Sans font fallback), and run `npm install` inside `frontend/`.

- [ ] **Step 2: Write failing `frontend/src/__tests__/calculators.test.ts`**

Test:
- `parseDecimalInput('68,5') === 68.5`, `parseDecimalInput(' 1.5 ') === 1.5`, `parseDecimalInput('') === null` (Review Focus #1).
- `previewProfileMetrics` matches spec BMI Kemenkes RI, Mifflin-St Jeor BMR, TDEE, and `1200`/`1500` safe floors.
- `previewFoodNutrition` matches gram and `default_unit` modes.
- `previewActivityCalories` for Jalan Santai `500 m` at `70 kg` returns `27` kkal and `6.67` min; `Yoga` with `m` returns `null`.
- Verify `api/client.ts` builds URLs starting with `./api.php?route=` (no hardcoded root `/api`, Review Focus #5).

- [ ] **Step 3: Run Vitest to verify it fails**

Run: `npm --prefix frontend test -- --run`  
Expected: FAIL because `utils/calculators.ts` and `api/client.ts` do not exist yet.

- [ ] **Step 4: Implement `types.ts`, `api/client.ts`, `utils/calculators.ts`, `index.css`, `Layout.tsx`, and `OnboardingView.tsx`**

- `Layout.tsx`: Clean warm health-tech shell (emerald/teal primary, amber/coral energy accent, indigo weight accent, tabular numerals, desktop left sidebar + mobile bottom navigation bar for `Dashboard`, `Catatan`, `Katalog`, `Profil`, plus toast banner).
- `OnboardingView.tsx`: Single-screen welcoming setup form (Nama opsional, BB awal, TB, Usia, Jenis Kelamin, Tingkat Aktivitas, Tujuan Diet, Target BB) with live-updating preview card showing BMI + kategori Kemenkes RI, BMR, TDEE, and rekomendasi target kalori harian.

- [ ] **Step 5: Run Vitest to verify it passes**

Run: `npm --prefix frontend test -- --run`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold React frontend with API client, preview calculators, layout, and onboarding"
```

---

### Task 6: Quick-Log Modals, Interactive Dashboard & Daily Log Page

**Files:**
- Create: `frontend/src/components/QuickLogModals.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/DailyLogPage.tsx`

**Interfaces:**
- Consumes: `types.ts`, `api/client.ts`, `utils/calculators.ts`
- Produces:
  - `FoodLogModal` (`isOpen`, `date`, `initialMealType?`, `editingLog?`, `foods`, `onClose`, `onSaved`, `onFoodCreated`)
  - `ActivityLogModal` (`isOpen`, `date`, `currentWeightKg`, `editingLog?`, `activities`, `onClose`, `onSaved`, `onActivityCreated`)
  - `WeightLogModal` (`isOpen`, `date`, `initialWeight?`, `onClose`, `onSaved`)
  - `DashboardPage` (`dashboard`, `range`, `onRangeChange`, `onOpenFoodModal`, `onOpenActivityModal`, `onOpenWeightModal`, `loading`)
  - `DailyLogPage` (`selectedDate`, `onDateChange`, `dayData`, `onAddFood`, `onEditFood`, `onDeleteFood`, `onAddActivity`, `onEditActivity`, `onDeleteActivity`, `onLogWeight`, `loading`)

- [ ] **Step 1: Implement `frontend/src/components/QuickLogModals.tsx`**

Build all three fast-entry modals (`<10s` input UX):
- **`FoodLogModal`**: Tab/toggle between *"Cari di Katalog"* (real-time search sorting favorites first, meal selector `Sarapan`/`Siang`/`Malam`/`Camilan`, unit switcher between `default_unit` and `gram`, quantity input with comma support, instant calorie & macro preview badge) and *"Input Manual / Tambah Katalog"* (enter custom name + calories, with optional checkbox *"Simpan ke katalog pribadi agar bisa dipakai lagi"*). Supports both create and edit mode.
- **`ActivityLogModal`**: Tab/toggle between *"Cari Aktivitas"* (real-time search sorting favorites first, dynamic unit pill switcher showing `meter` / `km` / `menit` when `supports_distance === 1` and `menit` when `0`, numeric input e.g. `500` `m`, live burned-calorie preview displaying the active body weight & estimated duration) and *"Input Manual / Tambah Katalog"*. Supports both create and edit mode.
- **`WeightLogModal`**: Date input, weight (`kg`, comma/dot friendly), optional notes, submits upsert to `POST weight-logs`.

- [ ] **Step 2: Implement `frontend/src/pages/DashboardPage.tsx`**

Build the informative, attractive dashboard:
- Header with greeting, today's Indonesian date, and 3 prominent quick-action buttons (`+ Catat Makan`, `+ Catat Aktivitas`, `+ Catat BB`).
- **Today Hero Grid**:
  - SVG circular progress gauge for **Kalori Masuk vs Target** + remaining quota badge (transparently explaining `+ kalori aktivitas`).
  - **Kalori Keluar Aktivitas** card with daily activity count and net balance vs TDEE.
  - **Berat Badan Terkini** card with latest weight, delta vs initial weight, and Kemenkes RI BMI pill.
  - Compact **Makro Hari Ini** bar (Protein, Karbohidrat, Lemak).
- **Evaluasi Program Diet (Kalori vs BB)** card with `7 Hari`, `14 Hari`, `30 Hari`, `Semua` filter pills, color-coded verdict badge (`Mengumpulkan Data` / `Sesuai Jalur` / `Turun Lebih Cepat` / `Lebih Lambat`), side-by-side comparison of **Perubahan BB Aktual** vs **Estimasi Teoritis (1 kg ≈ 7.700 kkal)**, and clear Indonesian explanation.
- **Two Recharts Visuals** (`ResponsiveContainer`):
  - **Tren Berat Badan**: `ComposedChart`/`LineChart` with Actual Weight dots/line (indigo), 7-day Moving Average (dashed slate), Anchored Theoretical Projection line (emerald), and Target Weight `ReferenceLine`.
  - **Kalori Harian**: `ComposedChart` with Kalori Masuk bars (emerald), Kalori Terbakar bars (amber/coral), and Target Kalori `ReferenceLine`.

- [ ] **Step 3: Implement `frontend/src/pages/DailyLogPage.tsx`**

Build the date-navigable daily log screen:
- Date bar (`<`, date input, `>`, `"Hari Ini"` button) + compact day summary bar (Masuk, Aktivitas, Sisa Kuota, BB hari itu).
- Four meal sections (`Sarapan`, `Makan Siang`, `Makan Malam`, `Camilan`) with quick `+ Tambah` per meal, showing food name, portion/unit, macros, calories, edit and delete actions (with clean inline confirmation).
- Activity section showing distance/duration badges (e.g. `500 m • ~6,7 mnt`), weight used, burned calories, edit and delete actions.

- [ ] **Step 4: Type-check frontend (`tsc --noEmit`)**

Run: `npx --prefix frontend tsc --noEmit`  
Expected: Exit code 0 with zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/QuickLogModals.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/DailyLogPage.tsx
git commit -m "feat: add quick-log modals, interactive dashboard, and daily log views"
```

---

### Task 7: Catalog Page, Profile & Export Page, App Wiring, UI Tests & Production Build Verification

**Files:**
- Create: `frontend/src/pages/CatalogPage.tsx`
- Create: `frontend/src/pages/ProfilePage.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/__tests__/AppFlows.test.tsx`
- Build output: `public/` (via `npm --prefix frontend run build`)

**Interfaces:**
- Consumes: All pages, modals, `Layout`, `OnboardingView`, `api/client.ts`
- Produces: Complete compiled web app in `public/` served by `index.php` + `api.php`

- [ ] **Step 1: Implement `frontend/src/pages/CatalogPage.tsx` and `frontend/src/pages/ProfilePage.tsx`**

- `CatalogPage.tsx`: Two sub-tabs (`Makanan` & `Aktivitas`), real-time search, category filter pills, favorites-only toggle, star button to toggle favorite, `+ Tambah Kustom` modal/form, edit & delete controls only for `is_custom === 1` items (built-in items display a subtle `"Bawaan"` badge).
- `ProfilePage.tsx`: Profile & Diet Program settings form (height, age, gender, activity level, goal type, target weight, toggle between **Target Kalori Otomatis** vs **Manual** with live preview), complete **Riwayat Berat Badan** table (add/edit/delete entries), and **Ekspor Cadangan Data (JSON)** button triggering client-side `.json` file download from `GET export`.

- [ ] **Step 2: Wire `frontend/src/App.tsx` and `frontend/src/main.tsx`**

Connect initial profile fetch (show `OnboardingView` if `!profile.exists`), load catalog + dashboard + selected-day logs, coordinate all 3 quick-log modals (refreshing dashboard & day logs automatically after any mutation), and show toast feedback on save/delete/error.

- [ ] **Step 3: Write `frontend/src/__tests__/AppFlows.test.tsx` and run full Vitest suite**

Test key end-to-end UI interactions (mocking `api/client.ts` & ResizeObserver for Recharts):
1. First visit without profile renders `OnboardingView`, calculates live BMI/TDEE when user types BB `70` & TB `170`, and submits profile.
2. Opening `ActivityLogModal`, selecting `Jalan Santai`, choosing unit `m`, typing `500` immediately displays `27 kkal` preview before saving.
3. Opening `FoodLogModal`, selecting `Nasi Putih`, typing `1,5` `piring` immediately displays `293 kkal` preview before saving.
4. `DashboardPage` displays today's calorie summary and diet evaluation verdict (`Sesuai Jalur`) cleanly.

Run: `npm --prefix frontend test -- --run`  
Expected: All Vitest test files PASS.

- [ ] **Step 4: Build production assets into `public/` and verify no hardcoded root paths (Review Focus #5)**

Run: `npm --prefix frontend run build`  
Verify `public/index.html` references `./assets/...` (relative paths) and run all PHP tests + a live HTTP smoke check against `php -S 127.0.0.1:8765` (checking `GET /` serves HTML 200 and `GET /api.php?route=foods` returns JSON `ok: true` with ≥120 foods, then stop the server).

- [ ] **Step 5: Final Commit**

```bash
git add frontend/ public/
git commit -m "feat: complete catalog, profile, export, UI tests, and production build"
```
