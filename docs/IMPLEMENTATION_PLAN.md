# 🚀 Implementation Handoff: Code Review Remediation

**Date:** December 3, 2025
**Project:** CertPrep.ai
**Status:** Code Review Complete -> Ready for Implementation

---

## 👤 Target Persona: Senior Full-Stack Implementation Engineer

**Who you are:**
You are a meticulous Senior Software Engineer with deep expertise in Next.js 16 (App Router), TypeScript, Supabase (Postgres/RLS), and Client-Side Databases (Dexie.js). You value stability, security, and clean code. You do not just "apply patches"; you understand the systemic impact of every change.

**Your Mission:**
Execute a prioritized remediation plan derived from a comprehensive code review. You are responsible for fixing critical production blockers (CSP, DB Migrations), hardening data integrity (Schema FKs), and ensuring test validity (RLS assertions).

---

## 📂 Context & Architecture

| Component | Details |
|-----------|---------|
| **Framework** | Next.js 16.0.4 (App Router) |
| **Middleware** | `src/proxy.ts` (Do **NOT** rename to `middleware.ts`) |
| **Local DB** | Dexie.js 4.2 (IndexedDB wrapper) - **Primary Write Source** |
| **Remote DB** | Supabase (Postgres) |
| **Testing** | Vitest (Unit/Integration), Playwright (E2E) |

### ⚠️ Critical Constraints
1.  **Offline-First Integrity**: Changes to `src/db` (Dexie) must handle large datasets gracefully to avoid crashing client browsers.
2.  **CSP Strictness**: The application runs with a strict Content Security Policy in production. Inline styles *must* use nonces.
3.  **Test Validity**: Security tests must verify their setup steps to avoid "vacuous truths" (false positives).

---

## 📝 Step-by-Step Implementation Plan

Execute these tasks in the order presented. This order prioritizes **Production Stability** > **Data Integrity** > **Code Quality**.

### 🔴 Phase 1: Production Stability (Must Fix)

#### 1. Fix CSP Blocking Inline Styles (#2) ✅
**File:** `src/proxy.ts`
**Status:** **Complete**
**Notes:** Nonce generation and `style-src` directive implemented correctly.

#### 2. Batched Dexie Migrations (#5) ✅
**File:** `src/db/index.ts`
**Status:** **Complete**
**Notes:** Migration V6 now uses `offset`/`limit` batching with error handling for `computeQuizHash`.

### 🟠 Phase 2: Data Integrity & Security (High Priority)

#### 3. Hardening RLS Tests (#10, #11) ✅
**File:** `tests/security/rls.test.ts`
**Status:** **Complete**
**Notes:** Setup assertions (`expect(insertError).toBeNull()`) added to all RLS test cases.

#### 4. Schema Foreign Keys & Constraints (#6, #7) ✅
**File:** `src/lib/supabase/schema.sql`
**Status:** **Complete**
**Notes:**
- `results.quiz_id` converted to UUID with FK constraint.
- `handle_new_user` trigger hardened with `COALESCE` and null checks.

#### 5. Sync Backfill Error Handling (#12) [NEW]
**File:** `src/lib/sync/quizSyncManager.ts`
**Goal:** Prevent marking sync as "done" if errors occurred during backfill.
**Action:**
- Track `hasErrors` boolean in the loop.
- If `hasErrors` is true, skip the final `setQuizBackfillDone(userId)` call so it retries later.

#### 6. Circuit Breaker & Lock Hardening (#13) [NEW]
**File:** `src/lib/sync/syncManager.ts`
**Goal:** Stop retrying on server errors and reduce lock contention.
**Action:**
- Add `status === 500 || status === 503` to the error code check in the circuit breaker logic.
- Reduce fallback lock timeout from `30000` (30s) to `15000` (15s) to improve UX when tabs crash.

#### 7. Fix Sync Order for FK Constraints (#17) [NEW P1]
**File:** `src/hooks/useSync.ts`
**Goal:** Prevent "Foreign Key Violation" errors when syncing new offline data.
**Context:** `syncResults` (Step 1) currently runs before `syncQuizzes` (Step 2). If a result references a new offline quiz, Step 1 fails because the quiz doesn't exist on the server yet.
**Action:**
- Swap the order: Call `await syncQuizzes(userId)` **BEFORE** `await syncResults(userId)`.

#### 8. Fix Profile Trigger Regression (#18) [NEW P2]
**File:** `src/lib/supabase/schema.sql`
**Goal:** Fix logic bug where new users get blank names instead of their email.
**Context:** The previous hardening `CASE WHEN ... THEN ''` prevents `COALESCE` from falling back to `new.email`.
**Action:**
- Revert to the simpler, correct logic: `COALESCE(new.raw_user_meta_data ->> 'full_name', new.email, '')`.
- Ensure `->>` operator is used (it safely returns null for missing keys).

### 🟡 Phase 3: Code Quality & Reliability (Medium Priority)

#### 9. Schema Enhancements (#14) [NEW]
**File:** `src/lib/supabase/schema.sql`
**Goal:** Improve type safety.
**Action:**
- Create `quiz_mode` ENUM type.
- Update `results` table to use `quiz_mode` instead of `text` + CHECK constraint.
- Add `NOT NULL` constraints to `display_name` (profiles) and `description` (quizzes) with defaults where appropriate.

#### 10. Fix Unhandled Promise Rejection in Retry (#1) ✅
**File:** `src/hooks/useQuizSubmission.ts`
**Status:** **Complete**
**Notes:** `retrySave` now catches the promise rejection and logs it instead of re-throwing.

#### 11. E2E Auth Fixture Hardening (#8, #9) ✅
**File:** `tests/e2e/fixtures/auth.ts` & `tests/e2e/global-setup.ts`
**Status:** **Complete**
**Notes:**
- Dynamic auth cookie key implemented based on project ref.
- JWT base64 decoding hardened with `replace(/-/g, '+')`.

#### 12. Data Export Type Safety (#15) [NEW]
**File:** `src/lib/dataExport.ts`
**Goal:** Fix unsound type guard.
**Action:**
- Add `typeof obj.exportedAt === 'string'` check to the `validateImportData` type guard function.

### 🟢 Phase 4: Housekeeping (Low Priority)

#### 13. Lint Staged Configuration (#4) ✅
**File:** `package.json`
**Status:** **Complete**
**Notes:** `lint-staged` config added to `package.json`.

#### 14. Cleanup Nitpicks (#16) [NEW]
**Files:**
- `src/lib/supabase/client.ts`: Remove redundant `supabaseUrl &&` check. Align error handling with server client (throw in dev).
- `src/hooks/useSync.ts`: Deduplicate `runInitialSync` logic (call `sync()` internally).
- `src/components/layout/Header.tsx`: Use `logger` instead of `console.log`.
- `public/sw.js`: Remove redundant JSDoc, redundant GET check, redundant cache lookup.
- `tests/e2e/helpers/db.ts`: Add logging to silent catch block. Use `put()` instead of `add()` for idempotent seeding.
- `src/db/index.ts`: Remove redundant `(quiz as Quiz)` cast.
- `tests/e2e/offline-sync.spec.ts`: Replace hardcoded `waitForTimeout` with `expect().toBeVisible()` assertions. Simplify RegExp.

---

## ✅ Verification Checklist

After implementing, run these commands to verify:

1.  **Type Check & Lint**: `npm run typecheck && npm run lint` (Must pass clean).
2.  **Unit/RLS Tests**: `npm run test` (Focus on `rls.test.ts` passing reliably).
3.  **Build**: `npm run build` (Ensures CSP nonce logic doesn't break the build).
4.  **Migration Check**: (Manual) Load the app in a browser, check Console for "Database initialized", ensuring the new batching logic didn't break Dexie.