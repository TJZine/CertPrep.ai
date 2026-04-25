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

`playwright.config.ts` and `global-setup.ts` currently launch Chromium with `--disable-web-security`.

> [!WARNING]
> Historical analysis below was refreshed on 2026-04-15 after the CSP implementation changed. Do not reuse older assumptions that production `style-src` currently depends on nonces; the current repo truth is `src/lib/security.ts`.

#### Root Cause Analysis

1. **CSP Implementation** (`src/proxy.ts`):
   - Generates per-request nonce via `crypto.randomUUID()`
   - Passes nonce to layout via `x-nonce` header
   - Uses script nonces plus a hashed service-worker bootstrap script
   - Currently allows `'unsafe-inline'` for `style-src` in both development and production via `src/lib/security.ts`

2. **Why Tests Fail Without the Flag**:
   - The exact failure mode is not yet revalidated against the current CSP implementation
   - Older notes blamed nonce propagation and Turbopack/HMR style injection, but that theory no longer matches the current `style-src` policy
   - The remaining possibilities include another browser-security interaction, a stale workaround that is no longer necessary, or a different runtime bootstrap issue during Playwright startup
   - This item should be re-investigated from current code and current Playwright behavior before changing CSP policy

3. **Why This Doesn't Affect Production**:
   - The flag is isolated to local Playwright/browser launch configuration
   - Repo-visible production CSP policy lives in `src/lib/security.ts` and `src/proxy.ts`
   - Removing the flag safely should not require redefining production CSP unless fresh evidence shows a real boundary bug

#### Why Common Suggestions Don't Work

| Suggestion                                     | Issue                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| "Treat this as a pure CSP nonce problem"       | Current repo code no longer supports that assumption; verify the actual failure first.  |
| "Tighten production CSP while debugging tests" | Risks turning test-infra cleanup into a real security-boundary change without evidence. |
| "Create test-specific middleware"              | Would duplicate `src/proxy.ts` and blur the runtime authority surface.                  |

#### Proposed Fix (When Prioritized)

```typescript
// 1. Reproduce the failure on current mainline code without changing CSP policy.
// 2. Remove `--disable-web-security` from Playwright config and global setup in a branch.
// 3. Run `npm run test:e2e` with the required local secrets.
// 4. If failures appear, capture the exact browser/CSP/runtime error and only then decide whether:
//    a) the workaround is stale and can be deleted,
//    b) Playwright/dev-server bootstrapping needs adjustment, or
//    c) a real CSP/runtime boundary bug exists and must be treated as Tier 2/Tier 3 work.
// 5. If CSP policy truly changes, update docs/ARCHITECTURE.md in the same pass.
```

#### Acceptance Criteria

- [ ] E2E tests pass without `--disable-web-security`
- [ ] Any remaining failures are explained by current evidence, not stale nonce assumptions
- [ ] No production CSP policy change is made without explicit justification and matching doc updates
- [ ] Document the confirmed root cause or the removal of the stale workaround in `docs/E2E_DEBUGGING_REFERENCE.md`

#### Decision

**Deferred** - Current workaround (flag + documentation) is acceptable because:

1. The flag is limited to the Playwright/browser test harness, not repo-visible production behavior, but it weakens E2E coverage as evidence for CSP and related browser-security behavior while it remains in place
2. The previous root-cause theory drifted from current code and needs a fresh investigation before product/security changes
3. Effort-to-value ratio is still low until the test harness becomes a higher-priority trust boundary
4. This work should follow the runbook's Playwright/E2E verification path, including `npm run test:e2e` when secrets are available

#### Re-evaluation Triggers

Revisit this issue when any of the following occur:

- [ ] A fresh repro confirms the current root cause
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
