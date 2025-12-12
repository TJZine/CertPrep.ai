# TODO / Backlog

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

## Feature: Custom Study Sessions ("Areas to Improve")

**Priority**: Medium | **Effort**: 1-2 days | **Category**: Analytics / Core Features

### Context

In the Analytics dashboard, the "Values" card (Weak Areas) has a "Study This Topic" button. Currently, this button triggers an empty handler because the quiz runner (`ZenModePage`) requires a static Quiz ID, but "Weak Areas" aggregate questions across _multiple_ quizzes.

### Proposed Solution (Option B: Generated Custom Quizzes)

Enable users to launch a practice session containing _all_ questions for a specific category (e.g., "Biology") from their entire library.

### Implementation Plan

#### 1. Database & Types

- Add `isGenerated?: boolean` (or `type: 'standard' | 'generated'`) to the `Quiz` interface (`src/types/quiz.ts`).
- Implement `createGeneratedQuiz` in `src/db/quizzes.ts`:
  - Accepts a title (e.g., "Biology Practice") and a list of Questions.
  - Generates a UUID and saves to Dexie.
  - Sets `created_at` timestamp.

#### 2. Aggregation Logic (`src/lib/quiz-generator.ts`)

- Create `generateCategoryQuiz(category: string, allQuizzes: Quiz[]): Quiz`.
- Logic:
  - Iterate through all available quizzes.
  - Extract unique questions matching `category` (case-insensitive).
  - Return a new `Quiz` object ready for persistence.

#### 3. Frontend Integration (`src/app/analytics/page.tsx`)

- Implement the `handleStudyTopic` function:
  1. Call `generateCategoryQuiz` with the selected category.
  2. Persist the result via `createGeneratedQuiz`.
  3. Redirect to the filtered quiz: `router.push('/quiz/[new-id]/zen')`.

#### 4. Maintenance / Cleanup

- Since these are temporary sessions, add a cleanup routine (e.g., on app init) to delete `isGenerated: true` quizzes older than 24 hours to prevent database bloat.

### Acceptance Criteria

- [ ] Clicking "Study This Topic" on "Biology" creates a new quiz session.
- [ ] The session contains all Biology questions from the user's library.
- [ ] The session works with existing Zen Mode features (scoring, explanations).
- [ ] Generated quizzes do not permanently clutter the main "Library" view (or are marked clearly).

---

## Feature: SRS Supabase Sync (Cross-Device)

**Priority**: Medium | **Effort**: 4-8 hours | **Category**: Data Sync

### Context

The Spaced Repetition System (SRS) was implemented with **local-only storage** (Dexie/IndexedDB) for initial MVP scope. This creates significant UX limitations.

### Current Limitations

| Issue                | Impact                                                |
| -------------------- | ----------------------------------------------------- |
| **Device-bound**     | SRS progress doesn't sync across devices/browsers     |
| **Data loss risk**   | Clearing browser data wipes all SRS state (no backup) |
| **Browser-specific** | Users studying on phone won't see progress on desktop |

### Proposed Solution

1. **Add Supabase table**: `srs_state` with RLS policies for user isolation
2. **Sync integration**: Mirror `results` sync pattern in `src/lib/sync/`
3. **Conflict resolution**: Last-write-wins based on `last_reviewed` timestamp

### Schema Draft

```sql
CREATE TABLE srs_state (
  question_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box SMALLINT CHECK (box BETWEEN 1 AND 5),
  last_reviewed TIMESTAMPTZ NOT NULL,
  next_review TIMESTAMPTZ NOT NULL,
  consecutive_correct SMALLINT DEFAULT 0,
  PRIMARY KEY (question_id, user_id)
);

-- RLS
ALTER TABLE srs_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own SRS state"
  ON srs_state FOR ALL USING (auth.uid() = user_id);
```

### Acceptance Criteria

- [ ] SRS state syncs to Supabase after quiz completion
- [ ] Opening app on new device pulls down SRS state
- [ ] Conflict resolution handles same question answered on two devices
- [ ] Offline functionality preserved (write to Dexie first, sync later)

### Migration Considerations (Existing Users)

When implementing sync, existing users will have **historical results without SRS state**. Options:

| Approach                   | Pros                                       | Cons                                                |
| -------------------------- | ------------------------------------------ | --------------------------------------------------- |
| **Backfill on first sync** | Users get SRS state for all past questions | Complex logic, could create many box-1 entries      |
| **SRS starts fresh**       | Simple, no migration                       | Users lose credit for previously mastered questions |
| **Prompt-based backfill**  | User choice, transparent                   | Extra UX flow to implement                          |

**Recommendation**: Start fresh (no backfill) with a clear "SRS tracks questions from now on" message. Backfill can be added later if users request it.
