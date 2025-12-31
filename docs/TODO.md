# TODO / Backlog

> Items are organized by priority level. Address **High Priority** items first.

---

## 🔴 High Priority

### Category Display UX: Investigate Improved Presentation Options

**Priority**: High | **Effort**: 2-4 hours | **Category**: UX / Analytics

#### Context

The Exam Readiness card shows categories with a "show more" button. Currently shows 6 initially, clicking expands to show all. With quizzes that have many categories (10+), the UI can become long.

#### Options to Investigate

1. **Scrollable Container** — Fixed height (~300px) with smooth scroll and visual fade at bottom
2. **Accordion/Collapsible Groups** — Group categories logically (Core Coverage, Supplemental, Regulatory)
3. **Toggle View Modes** — Compact (6) / Full (scrollable grid) / Chart (radar/bar visualization)
4. **Keep Current** — Current "show all" is simple and functional

#### Files

- `src/components/analytics/ExamReadinessCard.tsx`

#### Acceptance Criteria

- [ ] Review each option with mockups or prototypes
- [ ] Consider mobile responsiveness for each approach
- [ ] Evaluate accessibility (keyboard navigation, screen readers)
- [ ] Choose approach based on user testing or stakeholder feedback

---

### E2E Test Stability: Remove Fixed `waitForTimeout` Calls

**Status**: ✅ **Completed** (v1.4.3)
Moved to completed archive.

---

## 🟡 Medium Priority

### Sync Performance Optimization

**Priority**: Medium | **Effort**: Varies | **Category**: Performance

Future optimizations to consider if slow sync issues persist after the cursor fix.

#### Immediate (P0) ✅

- [x] Fix SRS cursor corruption (deterministic UUIDs + persistent healing)

#### High Priority (P1)

- [x] **Parallel sync execution** – Run Results, Quizzes, and SRS syncs concurrently instead of sequentially
  - File: `src/components/providers/SyncProvider.tsx`
  - Improvement: ~3x faster initial sync (4.5s → 1.5s)
- [x] **Debounced/coalesced sync triggers** – Batch rapid sync requests into single execution
  - Prevents redundant syncs when multiple components mount

#### Medium Priority (P2)

- [ ] **Selective column fetch for quizzes** – Don't fetch `questions[]` array on initial list sync
  - Only fetch full quiz when user opens it
  - File: `src/lib/sync/quizSyncManager.ts`
  - **Note**: Deferred — requires UI changes (loading states, lazy-load detection)
- [x] **Raise SLOW_SYNC_THRESHOLD for mobile** – Dynamic network-aware thresholds
  - WiFi/fast: 300ms | 4G: 500ms | 3G: 1000ms | 2G: 2000ms
  - File: `src/lib/sync/syncLogging.ts`
- [ ] **Compress large payloads** – Use gzip for quiz pushes with many questions
  - Supabase supports `Accept-Encoding: gzip`

#### Lower Priority (P3)

- [ ] **Background sync via Service Worker** – Move sync to SW for better UX
- [ ] **Delta sync for quizzes** – Only sync changed questions, not full array
- [ ] **Cursor-based pagination for Results** – Match SRS approach for consistency
- [ ] **IndexedDB read optimizations** – Batch local reads with `bulkGet`
- [ ] **Sync priority queue** – Results before Quizzes before SRS (user-facing first)

#### Monitoring

- [x] Add Sentry performance spans for each sync phase (Implemented in v1.4.3)
- [ ] Track sync duration percentiles (p50, p95, p99)
- [ ] Alert on sync duration regression

---

## 🟢 Low Priority

### Known Issues

---

### Technical Debt: Playwright `--disable-web-security` Flag

**Priority**: Low-Medium | **Effort**: 4-8 hours | **Category**: Test Infrastructure

#### Current State

`playwright.config.ts` and `global-setup.ts` include `--disable-web-security` to bypass CSP nonce validation failures in headless Chrome during E2E tests.

#### Root Cause Analysis

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

#### Why Common Suggestions Don't Work

| Suggestion                             | Issue                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "Use `extraHTTPHeaders` to inject CSP" | Can't inject HTML `nonce` attributes via headers—nonce must be in both CSP header AND every inline element |
| "Fix dev server nonce propagation"     | Already correct. The issue is Turbopack, not the middleware.                                               |
| "Create test-specific middleware"      | Would duplicate `proxy.ts` and still wouldn't fix Turbopack's style injection                              |

#### Proposed Fix (When Prioritized)

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

#### Acceptance Criteria

- [ ] E2E tests pass without `--disable-web-security`
- [ ] CSP violations are caught in Playwright (test fails if inline style lacks nonce)
- [ ] No regression in dev mode DX (HMR still works)
- [ ] Document any Turbopack limitations in `docs/E2E_DEBUGGING_REFERENCE.md`

#### Decision

**Deferred** - Current workaround (flag + documentation) is acceptable because:

1. Production CSP is enforced and validated by real browsers + Sentry
2. The security flag only affects test infrastructure, not production
3. Turbopack is actively developing; this may be fixed upstream
4. Effort-to-value ratio is low for current project scale

#### Re-evaluation Triggers

Revisit this issue when any of the following occur:

- [ ] Turbopack releases HMR style nonce propagation support
- [ ] Next.js 17+ ships with improved CSP handling in dev mode
- [ ] Security audit requires CSP validation in E2E tests
- [ ] Test suite grows beyond 50 E2E tests (higher confidence needed)

---

### Storage Maintenance / Garbage Collection

**Priority**: Low | **Effort**: 2-4 hours | **Category**: Data Management

#### Context & Reasoning

The application uses an "offline-first" architecture with **soft deletes** (tombstones). When a user deletes a quiz or result, it is marked with `deleted_at: timestamp` rather than being removed from IndexedDB.

**Why?**
This is critical for synchronization. If a record were hard-deleted immediately, other devices (or the server) would not know to delete their copies during the next sync, leading to "Zombie Data" (deleted items reappearing).

#### Problem

Over years of usage, these tombstones could theoretically accumulate. While the storage impact is negligible (text data is tiny), users may want a way to "fresh start" or clean up old data on specific devices.

#### Proposed Solution: Manual Maintenance

Instead of risky automated background garbage collection (which could accidentally purge tombstones before they sync), we should implement a **Manual Maintenance** feature.

**UI Location**: Settings > Storage > "Clear Deleted Data"

**Logic**:

1. Check if all pending changes have been successfully synced to the server.
2. If synced, safe to hard-delete local records where `deleted_at IS NOT NULL`.
3. If not synced, warn the user that unsynced deletions might reappear.

#### Why not automated GC?

Automated GC requires complex logic to know "has every other device seen this deletion?" which is impossible in a peer-to-peer or disconnected environment. Manual cleanup puts the decision in the user's hands and is significantly safer.

---

### SRS Orphan Cleanup

**Priority**: Low | **Effort**: 1-2 hours | **Category**: Data Management

#### Context

SRS states reference `question_id`, but questions are stored as JSONB inside quiz records. If a quiz is edited and a question is removed, the SRS state for that question becomes orphaned.

#### Impact

**Low** — Orphan SRS records:

- Are filtered out when loading (question not found → skipped)
- Don't affect sync (they push/pull fine)
- Only waste a few bytes of storage per record

#### Proposed Solution

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
>
> [!IMPORTANT]
> **Sync Implications**: This deletes orphans locally without syncing the deletion. If the server still has these records, they could reappear on the next pull. Consider either (1) running cleanup only after successful sync, or (2) adding an RPC to delete server-side orphans in the same operation.

#### Trigger Options

1. **Manual**: Settings > Storage > "Clean Up SRS Data" button
2. **Automatic**: Run after successful sync if > 30 days since last cleanup
3. **On quiz delete**: Clean SRS states for that quiz's questions

#### Acceptance Criteria

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

### Supabase Generated Types

**Status**: ✅ **Completed** (v1.4.3)
Moved to completed archive.

---

### Code Review Cleanups

**Priority**: Low | **Effort**: 2-4 hours | **Category**: Technical Debt

#### Performance Optimizations

- [ ] **CLS Fix**: `CategoryBreakdown` skeleton height in `ResultsContainer.tsx` is fixed at 200px, but content varies. Make it dynamic or use `min-h`.
- [ ] **E2E Timeouts**: Review `quiz-flow.spec.ts` 15s timeout once performance improves.

#### Test Cleanups

- [ ] **Investigation**: Why does `library.spec.ts` need `force: true` for clicks? Investigate potential overlay/z-index issues.
