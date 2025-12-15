# TODO / Backlog

---

## Feature: Quiz Format Info Page

**Priority**: Medium | **Effort**: 2-4 hours | **Category**: Documentation / UX

### Context

Users import custom quizzes and generate them via GPT/Gemini. To ensure quizzes have proper metadata (especially `category` and `subcategory` for analytics grouping), we need a clear info page documenting the expected JSON format.

### Deliverables

1. Create `/app/help/quiz-format/page.tsx` with:
   - Complete JSON schema documentation
   - Example quiz with all recommended fields
   - Field descriptions including `category` and `subcategory`
   - Tips for AI-generated quizzes

2. Link from import modal and quiz creation flows

### User Action Required

Update GPT/Gemini prompts for quiz generation to include `category` and `subcategory` fields.

### Acceptance Criteria

- [ ] Info page created with clear documentation
- [ ] Example JSON includes `category` and `subcategory`
- [ ] Link accessible from import modal
- [ ] Mobile-responsive layout

---

## Known Issues

### Sync Fails with "No valid auth session" (Dev Environment)

**Last Seen:** 2025-12-14

**Symptoms:**

- Console: `Sync skipped: No valid auth session { authError: undefined }`
- User is logged in (UI works, can take quizzes)
- Sync operations fail, "Unsynced" badge persists

**Root Cause:**
Stale browser cookies/localStorage. The `@supabase/ssr` client's `getSession()` reads from local cache which can become out of sync, while `onAuthStateChange` (used by AuthProvider) still works correctly.

**Workaround:**

> [!WARNING]
> "Clear site data" deletes IndexedDB and will **destroy all offline quizzes, results, and SRS progress** that haven't synced. Only use as a last resort if you have no unsaved work.

**Step 1 — Try safer fixes first:**

1. Sign out via the app UI (Settings → Sign Out)
2. Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)
3. Log back in

**Step 2 — If Step 1 fails, clear only auth cookies:**

1. DevTools → Application → Cookies → Select your domain
2. Delete cookies starting with `sb-` (e.g., `sb-xxx-auth-token`)
3. Hard refresh and log back in

**Step 3 — Last resort (data loss risk):**

1. DevTools → Application → Storage → "Clear site data"
2. Hard refresh (`Cmd+Shift+R` / `Ctrl+Shift+R`)
3. Log back in

**Permanent Fix (if recurs frequently):**
Change sync managers (`syncManager.ts`, `quizSyncManager.ts`, `srsSyncManager.ts`) to use `getUser()` instead of `getSession()`. This validates with the server (adds ~50-200ms latency) but is more reliable. See Supabase SSR docs.

---

## Technical Debt: Playwright `--disable-web-security` Flag

**Priority**: Low-Medium | **Effort**: 4-8 hours | **Category**: Test Infrastructure

### Current State

`playwright.config.ts` and `global-setup.ts` include `--disable-web-security` to bypass CSP nonce validation failures in headless Chrome during E2E tests.

### Root Cause Analysis

1. **CSP Implementation** (`src/proxy.ts`):
   - Generates per-request nonce via `crypto.randomUUID()`
   - Passes nonce to layout via `x-nonce` header
   - In **production**: `style-src 'self' 'nonce-${nonce}'` (strict)
   - In **development**: `style-src 'self' 'unsafe-inline' 'nonce-${nonce}'` (relaxed)

2. **Why Tests Fail Without the Flag**:
   - Playwright runs `npm run dev` which sets `NODE_ENV=development`
   - Development mode already includes `'unsafe-inline'`, so CSP _should_ be relaxed
   - However, **Turbopack/HMR** injects style chunks that don't propagate the nonce
   - The `x-nonce` header flows correctly, but injected HMR styles lack `nonce` attributes
   - Headless Chrome enforces CSP strictly, causing silent style failures

3. **Why This Doesn't Affect Production**:
   - Production builds have static chunks with nonces baked in during SSR
   - No HMR/Turbopack runtime injection
   - Real browsers receive consistent nonce across CSP header and inline elements

### Why Common Suggestions Don't Work

| Suggestion                             | Issue                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Use `extraHTTPHeaders` to inject CSP" | Can't inject HTML `nonce` attributes via headers—nonce must be in both CSP header AND every inline element |
| "Fix dev server nonce propagation"     | Already correct. The issue is Turbopack, not the middleware.                                               |
| "Create test-specific middleware"      | Would duplicate `proxy.ts` and still wouldn't fix Turbopack's style injection                              |

### Proposed Fix (When Prioritized)

```typescript
// 1. Add NODE_ENV=test to playwright webServer config
// playwright.config.ts
webServer: {
  command: "NODE_ENV=test npm run dev",
  // ...
}

// 2. In proxy.ts, treat 'test' like production (strict CSP)
const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";
const useStrictCsp = !isDev || isTest;

const styleSrc = useStrictCsp
  ? `'self' 'nonce-${nonce}' https://hcaptcha.com https://*.hcaptcha.com`
  : `'self' 'unsafe-inline' 'nonce-${nonce}' https://hcaptcha.com https://*.hcaptcha.com`;

// 3. Audit all components for inline styles without nonce
// 4. Either:
//    a) Disable Turbopack for test runs: command: "NODE_ENV=test npm run dev -- --webpack"
//    b) Wait for Turbopack to support nonce propagation in HMR styles

// 5. Remove --disable-web-security from:
//    - playwright.config.ts (line ~51)
//    - tests/e2e/global-setup.ts (line ~116)
```

### Acceptance Criteria

- [ ] E2E tests pass without `--disable-web-security`
- [ ] CSP violations are caught in Playwright (test fails if inline style lacks nonce)
- [ ] No regression in dev mode DX (HMR still works)
- [ ] Document any Turbopack limitations in `docs/E2E_DEBUGGING_REFERENCE.md`

### Decision

**Deferred** - Current workaround (flag + documentation) is acceptable because:

1. Production CSP is enforced and validated by real browsers + Sentry
2. The security flag only affects test infrastructure, not production
3. Turbopack is actively developing; this may be fixed upstream
4. Effort-to-value ratio is low for current project scale

### Re-evaluation Triggers

Revisit this issue when any of the following occur:

- [ ] Turbopack releases HMR style nonce propagation support
- [ ] Next.js 17+ ships with improved CSP handling in dev mode
- [ ] Security audit requires CSP validation in E2E tests
- [ ] Test suite grows beyond 50 E2E tests (higher confidence needed)

---

## Feature: Storage Maintenance / Garbage Collection

**Priority**: Low | **Effort**: 2-4 hours | **Category**: Data Management

### Context & Reasoning

The application uses an "offline-first" architecture with **soft deletes** (tombstones). When a user deletes a quiz or result, it is marked with `deleted_at: timestamp` rather than being removed from IndexedDB.

**Why?**
This is critical for synchronization. If a record were hard-deleted immediately, other devices (or the server) would not know to delete their copies during the next sync, leading to "Zombie Data" (deleted items reappearing).

### Problem

Over years of usage, these tombstones could theoretically accumulate. While the storage impact is negligible (text data is tiny), users may want a way to "fresh start" or clean up old data on specific devices.

### Proposed Solution: Manual Maintenance

Instead of risky automated background garbage collection (which could accidentally purge tombstones before they sync), we should implement a **Manual Maintenance** feature.

**UI Location**: Settings > Storage > "Clear Deleted Data"

**Logic**:

1. Check if all pending changes have been successfully synced to the server.
2. If synced, safe to hard-delete local records where `deleted_at IS NOT NULL`.
3. If not synced, warn the user that unsynced deletions might reappear.

### Why not automated GC?

Automated GC requires complex logic to know "has every other device seen this deletion?" which is impossible in a peer-to-peer or disconnected environment. Manual cleanup puts the decision in the user's hands and is significantly safer.

---

## Maintenance: SRS Orphan Cleanup

**Priority**: Low | **Effort**: 1-2 hours | **Category**: Data Management

### Context

SRS states reference `question_id`, but questions are stored as JSONB inside quiz records. If a quiz is edited and a question is removed, the SRS state for that question becomes orphaned.

### Impact

**Low** — Orphan SRS records:

- Are filtered out when loading (question not found → skipped)
- Don't affect sync (they push/pull fine)
- Only waste a few bytes of storage per record

### Proposed Solution

Create a periodic cleanup function that removes SRS records where the question no longer exists in any quiz. Uses query-based deletion to avoid compound primary key dependencies.

```typescript
// src/db/maintenance.ts
export async function cleanOrphanedSRSStates(userId: string): Promise<number> {
  const allQuestions = new Set<string>();

  // Collect all valid question IDs from all non-deleted quizzes
  const quizzes = await db.quizzes.where("user_id").equals(userId).toArray();
  for (const quiz of quizzes) {
    if (!quiz.deleted_at) {
      for (const q of quiz.questions) {
        allQuestions.add(q.id);
      }
    }
  }

  // Use query-based deletion to avoid compound PK shape dependencies
  const deletedCount = await db.srs
    .where("user_id")
    .equals(userId)
    .filter((s) => !allQuestions.has(s.question_id))
    .delete();

  return deletedCount;
}
```

> [!NOTE]
> **Tombstone Handling**: Quizzes with `deleted_at` set are intentionally excluded from the valid questions set, meaning their questions' SRS states will be cleaned up. SRS records themselves do not use tombstones—they sync via Last-Write-Wins (LWW) and are fully deleted locally.
> [!IMPORTANT]
> **Sync Implications**: This deletes orphans locally without syncing the deletion. If the server still has these records, they could reappear on the next pull. Consider either (1) running cleanup only after successful sync, or (2) adding an RPC to delete server-side orphans in the same operation.

### Trigger Options

1. **Manual**: Settings > Storage > "Clean Up SRS Data" button
2. **Automatic**: Run after successful sync if > 30 days since last cleanup
3. **On quiz delete**: Clean SRS states for that quiz's questions

### Acceptance Criteria

- [ ] Implement `cleanOrphanedSRSStates()` function
- [ ] Add unit tests verifying orphan detection and cleanup
- [ ] Add test case: deleted quizzes' questions are treated as orphans
- [ ] Add test case: cleanup doesn't affect synced records incorrectly
- [ ] Decide on trigger mechanism (manual preferred for safety)
- [ ] **Sync Strategy**: Choose one approach and document:
  - Option A: Run cleanup only after successful client→server sync (test: verify no reappearance on next pull)
  - Option B: Add server-side RPC to delete orphans atomically (test: E2E RPC test)
  - Option C: Accept orphans as low-risk (no sync test needed)
- [ ] Optional: Add UI indicator showing cleanup results

---

## Infrastructure: Supabase Generated Types

**Priority**: Low-Medium | **Effort**: 1-2 hours | **Category**: Developer Experience / Type Safety

### Context

Supabase client calls currently use the untyped `SupabaseClient` type, meaning table names, column names, and RPC function signatures are **magic strings** validated only at runtime.

### Current State

**3 files with untyped Supabase data operations:**

| File                | Tables    | Operations             |
| ------------------- | --------- | ---------------------- |
| `syncManager.ts`    | `results` | select, upsert, delete |
| `quizRemote.ts`     | `quizzes` | select, upsert, update |
| `srsSyncManager.ts` | `srs`     | **rpc**, select        |

**8 additional files** use Supabase for auth-only (no data queries—no benefit from generated types).

### Problem

Without generated types:

- Typos in column names (e.g., `quzi_id`) are not caught until runtime
- RPC function names and signatures are magic strings
- No IDE autocompletion for Supabase queries
- Must maintain parallel Zod schemas for basic shape validation

### Proposed Solution

Generate TypeScript types from the Supabase schema:

```bash
# Add to package.json scripts
"supabase:types": "supabase gen types typescript --linked > src/types/database.types.ts"
```

Then type the client:

```typescript
// src/lib/supabase/client.ts
import type { Database } from "@/types/database.types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createClient = () => createSupabaseClient<Database>(url, key);
```

### Benefits

| Benefit                    | Impact                                     |
| -------------------------- | ------------------------------------------ |
| **Build-time errors**      | Catch typos in table/column names          |
| **Typed RPC calls**        | `upsert_srs_lww_batch` signature validated |
| **IDE autocompletion**     | Better DX for all Supabase queries         |
| **Single source of truth** | Schema → Types, no duplicated shapes       |

### Trade-offs

| Consideration           | Notes                                                  |
| ----------------------- | ------------------------------------------------------ |
| **CI integration**      | Must regenerate types when schema changes              |
| **Generated file size** | ~500-1000 LoC (negligible for bundle, dev-only import) |
| **Migration effort**    | ~1-2 hours to set up and update 3 sync files           |

### Implementation Steps

1. [ ] Install/verify `supabase` CLI is available in dev dependencies
2. [ ] Pin CLI version in `package.json` for reproducibility:

   ```json
   "devDependencies": {
     "supabase": "1.145.0"
   }
   ```

3. [ ] Add `supabase:types` script to `package.json`:

   ```bash
   # For local development (no auth needed)
   "supabase:types": "supabase gen types typescript --local > src/types/database.types.ts"
   # OR for CI/linked projects (requires SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID secrets)
   "supabase:types:ci": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.types.ts"
   ```

   > [!NOTE]
   > For CI usage, ensure `SUPABASE_PROJECT_ID` and `SUPABASE_ACCESS_TOKEN` are set as repository secrets.

4. [ ] Generate initial `src/types/database.types.ts`
5. [ ] Create separate typed client helpers for browser and server:

   ```typescript
   // src/lib/supabase/client.ts (browser - uses NEXT_PUBLIC_ vars only)
   import type { Database } from "@/types/database.types";
   import { createBrowserClient } from "@supabase/ssr";
   export const createClient = () =>
     createBrowserClient<Database>(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
     );

   // src/lib/supabase/server.ts (server - can use service role if needed)
   import type { Database } from "@/types/database.types";
   import { createServerClient } from "@supabase/ssr";
   // NEVER expose SUPABASE_SERVICE_ROLE_KEY to browser code
   ```

6. [ ] Update sync files to use typed client (IDE will flag any mismatches)
7. [ ] Add CI step to regenerate types and fail on divergence:

   ```yaml
   - run: npm run supabase:types:ci
   - run: git diff --exit-code src/types/database.types.ts
   ```

8. [ ] Consider removing redundant Zod schemas where generated types suffice (keep Zod for coercion)

### Acceptance Criteria

- [ ] `npm run supabase:types` generates valid TypeScript
- [ ] All `.rpc()`, `.from()`, `.select()`, `.upsert()` calls are typed
- [ ] Build passes with strict TypeScript
- [ ] IDE provides autocompletion for column names

### Decision

**Deferred** — Current Zod-based runtime validation is sufficient. Prioritize when:

- Adding more RPC functions
- Onboarding new developers who would benefit from autocompletion
- Schema changes become frequent (to catch drift early)

---

## E2E Testing Opportunities

**Priority**: Medium | **Effort**: 4-8 hours | **Category**: Test Coverage

### Current E2E Coverage

| Spec File              | Coverage Area                                  |
| ---------------------- | ---------------------------------------------- |
| `quiz-flow.spec.ts`    | Quiz taking, answer selection, results display |
| `analytics.spec.ts`    | Analytics page, empty state, data display      |
| `library.spec.ts`      | Quiz library, import, search                   |
| `results.spec.ts`      | Results page display                           |
| `offline-sync.spec.ts` | Offline mode, sync behavior                    |
| `settings.spec.ts`     | Settings page                                  |

### Priority / Effort Matrix

| Gap               | Priority  | Effort        | Impact                 |
| ----------------- | --------- | ------------- | ---------------------- |
| SRS Review Flow   | 🔴 High   | Medium (2-3h) | Core feature untested  |
| Auth Edge Cases   | 🔴 High   | Low (1-2h)    | Security-sensitive     |
| Topic Study Mode  | 🟡 Medium | Low (1h)      | Recently added feature |
| Smart Round Mode  | 🟡 Medium | Medium (2h)   | Algorithm validation   |
| Cross-Device Sync | 🟡 Medium | High (3-4h)   | Complex setup          |
| Error States      | 🟢 Low    | Low (1h)      | Edge cases             |

### Gaps & Opportunities

#### 1. **SRS Review Flow** (High Priority)

No E2E coverage for spaced repetition features.

```typescript
// tests/e2e/srs-review.spec.ts
test.describe("SRS Review", () => {
  test("completes SRS review and saves result", async ({ page }) => {
    // Seed quiz with SRS-eligible questions
    // Navigate to SRS review card
    // Complete review session
    // Verify result is saved
  });

  test("shows SRS result on results page", async ({ page }) => {
    // Complete SRS review
    // Navigate to results by ID
    // Verify special SRS result display
  });

  test("SRS result syncs across devices", async ({ page }) => {
    // Complete SRS review (authenticated)
    // Verify result appears in Supabase
    // Simulate second device login
    // Verify SRS stats appear
  });
});
```

#### 2. **Authentication Flows** (High Priority)

Missing coverage for auth edge cases.

```typescript
// tests/e2e/auth.spec.ts
test("password reset flow completes successfully");
test("session recovery after token expiry");
test("sign out clears local data");
```

#### 3. **Topic Study Mode** (Medium Priority)

Weak area → Topic study navigation tested, but not the full flow.

```typescript
test("topic study loads relevant questions");
test("topic study filters by category");
```

#### 4. **Smart Round Mode** (Medium Priority)

Smart quiz prioritization not tested.

```typescript
test("smart round prioritizes weak categories");
test("smart round excludes mastered questions");
```

#### 5. **Cross-Device Sync** (Medium Priority)

`offline-sync.spec.ts` tests offline → online, but not multi-device.

```typescript
test("quiz created on device A appears on device B after sync");
test("result created on device A updates analytics on device B");
```

#### 6. **Error States & Edge Cases** (Low Priority)

Missing negative path testing.

```typescript
test("handles network failure during quiz submit gracefully");
test("handles corrupt IndexedDB gracefully");
test("displays error when quiz not found");
```

### Implementation Notes

- Use `seedTestQuiz` fixture pattern from existing tests
- Use `waitForDatabase()` helper for Dexie timing
- Mock Supabase for cross-device tests (or use test accounts)
- SRS tests need date mocking (e.g., `jest.useFakeTimers()` or similar Playwright-compatible approach) for `next_review` scheduling

### Acceptance Criteria

- [ ] Add `srs-review.spec.ts` with core SRS flow
- [ ] Add auth edge case tests to existing or new spec
- [ ] Verify all specs pass in CI
- [ ] Document any new fixtures in `tests/e2e/README.md`
