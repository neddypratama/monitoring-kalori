# MySQL Support & Migration Implementation Plan (Branch: `mysql`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dual-driver database support (MySQL & SQLite) on the dedicated `mysql` branch, enabling KaloriKu to run high-concurrency workloads on MySQL/MariaDB in production (cPanel) with automatic schema migration and seamless data migration from SQLite, while preserving local SQLite capability.

**Architecture:** 
- Dedicated configuration module (`backend/Config.php` and optional `backend/config.php`) supporting `DB_DRIVER` (`mysql` or `sqlite`), host, port, dbname, user, and password.
- Database abstraction in `backend/Database.php` that dynamically selects the PDO DSN, creates MySQL (InnoDB, utf8mb4) or SQLite schema, and provides database-agnostic SQL helpers (for upserts, now timestamps, and ignore inserts).
- Portable query updates across `backend/AuthService.php` and `backend/Router.php` replacing SQLite-only syntax (`datetime('now', 'localtime')`, `ON CONFLICT`, `INSERT OR IGNORE`) with driver-agnostic or helper-backed queries.
- Standalone CLI migration tool `backend/migrate_sqlite_to_mysql.php` to copy all existing users, profiles, catalogs, logs, settings, and audit trails from SQLite to MySQL safely.

**Tech Stack:** PHP 8.3, PDO (pdo_mysql & pdo_sqlite), MySQL 8.0 / MariaDB, Laragon, Vitest / PHPUnit custom assertions.

**Branch:** `mysql` (isolated from `main`).

## Global Constraints
- Branch isolation: All changes MUST stay on branch `mysql`. Branch `main` remains untouched on SQLite.
- Zero data loss: All 12 tables and existing data must migrate seamlessly without schema discrepancies or truncated columns.
- Backward compatibility: If no MySQL credentials are provided, `Database::connect()` seamlessly falls back to SQLite so local developers without MySQL can still run the app.
- Tests: All existing 9 PHP test suites (40 tests) must continue to pass on SQLite, plus a new comprehensive test suite for MySQL.

## Review Focus
1. Dialect differences in Upsert (`ON CONFLICT` in SQLite vs `ON DUPLICATE KEY UPDATE` in MySQL).
2. Dialect differences in Insert Ignore (`INSERT OR IGNORE` in SQLite vs `INSERT IGNORE` in MySQL).
3. Timestamp handling: replace SQLite-specific `datetime('now', 'localtime')` with parameter-bound `date('Y-m-d H:i:s')` or helper.
4. Auto-increment and Foreign Key syntax: `INTEGER PRIMARY KEY AUTOINCREMENT` in SQLite vs `INT AUTO_INCREMENT PRIMARY KEY` in MySQL InnoDB.
5. Migration idempotency: running migration scripts multiple times must not duplicate or corrupt existing records.

---

### Task 1: Environment & Configuration Loader (`backend/Config.php`)
**Files:**
- Create: `backend/Config.php`
- Create: `backend/config.sample.php`
- Modify: `.gitignore` (ensure `backend/config.php` is ignored)
- Test: `tests/php/ConfigTest.php`

- [ ] **Step 1: Write `tests/php/ConfigTest.php`** testing default SQLite config, environment variable overrides, and custom config array parsing.
- [ ] **Step 2: Implement `backend/Config.php`** to load configuration from `backend/config.php` or `getenv()` with sensible defaults (`DB_DRIVER=sqlite` or `mysql` when configured).
- [ ] **Step 3: Create `backend/config.sample.php`** documenting MySQL credentials for cPanel and Laragon.
- [ ] **Step 4: Run `php tests/php/ConfigTest.php`** and verify it passes.
- [ ] **Step 5: Git commit** on branch `mysql`.

---

### Task 2: Driver-Agnostic Database Connection & MySQL Schema DDL (`backend/Database.php`)
**Files:**
- Modify: `backend/Database.php`
- Test: `tests/php/DatabaseSeedTest.php`
- Test: `tests/php/MySqlDatabaseTest.php`

- [ ] **Step 1: Write `tests/php/MySqlDatabaseTest.php`** testing connection to MySQL (`127.0.0.1`, user `root`, test DB `monitoring_kalori_test`), table creation, and seeding.
- [ ] **Step 2: Update `backend/Database.php`** to:
  - Detect driver (`mysql` vs `sqlite`) from `Config`.
  - Execute MySQL DDL (InnoDB, utf8mb4, `AUTO_INCREMENT`, `FOREIGN KEY ... ON DELETE CASCADE`) for all 12 tables.
  - Provide query helper methods: `Database::upsertSetting()`, `Database::upsertWeightLog()`, `Database::insertFavorite()`, `Database::now()`.
- [ ] **Step 3: Run both `DatabaseSeedTest.php` (SQLite)** and **`MySqlDatabaseTest.php` (MySQL)**.
- [ ] **Step 4: Git commit** on branch `mysql`.

---

### Task 3: Driver-Agnostic Queries in `AuthService.php` and `Router.php`
**Files:**
- Modify: `backend/AuthService.php`
- Modify: `backend/Router.php`
- Test: `tests/php/AuthAndMigrationTest.php`
- Test: `tests/php/RouterApiTest.php`
- Test: `tests/php/RbacIsolationTest.php`

- [ ] **Step 1: Update `backend/AuthService.php`**:
  - Replace `datetime('now', 'localtime')` with parameterized `$now = date('Y-m-d H:i:s')`.
- [ ] **Step 2: Update `backend/Router.php`**:
  - Replace `datetime('now', 'localtime')` with `$now = date('Y-m-d H:i:s')`.
  - Replace `INSERT OR IGNORE INTO user_favorites` with driver-aware helper or conditional query.
  - Replace `ON CONFLICT` in `app_settings` and `weight_logs` with driver-aware upsert helpers.
- [ ] **Step 3: Run all existing test suites** (`AuthAndMigrationTest`, `RouterApiTest`, `RbacIsolationTest`) on SQLite.
- [ ] **Step 4: Run API and Auth test cases against MySQL** in `MySqlDatabaseTest.php`.
- [ ] **Step 5: Git commit** on branch `mysql`.

---

### Task 4: Automated Data Migration Tool (`backend/migrate_sqlite_to_mysql.php`)
**Files:**
- Create: `backend/migrate_sqlite_to_mysql.php`
- Test: `tests/php/MigrationToolTest.php`

- [ ] **Step 1: Write `tests/php/MigrationToolTest.php`** testing that mock SQLite database with users, profile, food logs, and custom foods migrates 100% accurately into MySQL.
- [ ] **Step 2: Implement `backend/migrate_sqlite_to_mysql.php`**:
  - Validates source SQLite file and target MySQL connection.
  - Runs target migrations.
  - Copies tables with `FOREIGN_KEY_CHECKS = 0` and batch inserts with duplicate prevention.
  - Outputs pretty CLI status and record counts.
- [ ] **Step 3: Run `php tests/php/MigrationToolTest.php`** to verify full data fidelity.
- [ ] **Step 4: Git commit** on branch `mysql`.

---

### Task 5: cPanel MySQL Deployment Guide & Verification
**Files:**
- Create: `docs/CPANEL_MYSQL_GUIDE.md`
- Modify: `deploy.sh` (add optional MySQL migration step if configured)
- Run full suite of PHP tests and frontend tests.

- [ ] **Step 1: Create `docs/CPANEL_MYSQL_GUIDE.md`** with step-by-step instructions (creating database in cPanel MySQL Databases, configuring `backend/config.php`, running migration, verifying in phpMyAdmin).
- [ ] **Step 2: Verify `deploy.sh`** works cleanly for both SQLite and MySQL deployments.
- [ ] **Step 3: Run all PHP tests and frontend tests**.
- [ ] **Step 4: Git commit & push branch `mysql`**.
