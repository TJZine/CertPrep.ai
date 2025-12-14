# Plan: Make Topic Study + SRS Review Fully Integrated (Results UI + Analytics)

## Persona (for the next agent)

You are a **Senior Offline‑First Product Engineer** specializing in:

- Dexie.js/IndexedDB data modeling + migrations
- Supabase Postgres + RLS + sync patterns
- React/Next.js UI state derived from local DB
- Analytics aggregation correctness + performance

Mission: **Make Topic Study and SRS Review behave like first‑class quiz attempts**:

- Results pages show the same quality of detail as normal quizzes (question review, counts, breakdowns).
- Analytics (weak areas, heatmap, trends, readiness) reflect improvements from these sessions.
- Sync remains offline‑first: Dexie is the source of truth; UI never writes to Supabase directly.

---

## Current Context / What’s Already Fixed

### Sync / “Unsynced badge” root cause

- Topic Study + SRS Review results used a per-user “SRS quiz” parent for FK compliance.
- The legacy SRS quiz ID format was `srs-{userId}` (not a UUID), but Supabase expects UUIDs for `quizzes.id` and `results.quiz_id`.
- Fix: SRS quiz IDs are now deterministic UUID v5, with legacy migration and sync unblock.

Key files:

- `src/db/quizzes.ts` (`getSRSQuizId`, migration, `getOrCreateSRSQuiz`)
- `src/components/providers/SyncProvider.tsx` (runs migration before sync)
- `src/lib/supabase/schema.sql` (`quizzes.id` and `results.quiz_id` are UUID columns)

### UX improvement: background sync on completion

- Topic Study + SRS Review completion now triggers `void sync()` (fire‑and‑forget) so the Unsynced badge clears automatically when online.
- Implemented in `src/components/quiz/ZenQuizContainer.tsx`.

---

## Problem Statements (Remaining)

### 1) Results page for Topic Study / SRS Review is incomplete + inconsistent

Observed:

- Score/time/mode show up, but question review and other details are missing.
- “0 correct / N incorrect” can show even when score is 100%.

Likely cause:

- Aggregated sessions store results under the per-user SRS quiz ID (a real quiz record with **empty `questions`**).
- Results UI grades/derives stats from the quiz’s `questions`, so it has nothing to grade.

### 2) Analytics do not improve after scoring well in Topic Study / SRS Review

Observed:

- Repeated 100% Topic Study runs don’t move Weak Areas / mastery metrics as expected.

Likely cause:

- Many analytics computations build a `quizMap` from the `quizzes` array passed into hooks.
- `useQuizzes()` intentionally filters out SRS quizzes.
- Aggregated results reference the SRS quiz ID, so analytics can’t locate a quiz with questions → those results contribute ~0 to category correctness totals.

---

## Constraints / Non‑Negotiables

- **Offline‑first**: Dexie is the source of truth.
- UI must not write to Supabase directly (only call the sync orchestrator).
- Avoid expensive work on the main thread where possible (batch, cache, memoize).
- Keep sanitization rules intact (don’t introduce unsafe HTML rendering).

---

## Recommended Approach (Phased, Low‑Risk)

### Phase 0 — Repro + Baseline Checks

1. Repro Topic Study results UI issue:
   - Analytics → Weak Areas → “Study This Topic”
   - Finish session → open `/results/:id`
   - Confirm missing question details / incorrect counts.
2. Repro analytics issue:
   - Note weak area score for a category.
   - Run Topic Study for that category with high score.
   - Re-check Weak Areas / heatmap / trends; confirm no improvement.
3. Verify raw data in Dexie:
   - `results` row has `question_ids`, `answers`, `category_breakdown`.
   - SRS quiz row exists but has `questions: []`.

Useful files:

- `src/db/results.ts` (`createTopicStudyResult`, `createSRSReviewResult`)
- `src/app/results/[id]/page.tsx`
- `src/components/results/ResultsContainer.tsx`

---

## Phase 1 — Fix Results Page for Aggregated Sessions (No Schema Changes)

Goal: If a result is for Topic Study / SRS Review, **hydrate a synthetic quiz** with the real questions so existing grading + UI works.

### 1.1 Add a shared helper to build an “aggregated quiz”

Reuse the pattern already implemented in:

- `src/app/quiz/topic-review/page.tsx` (builds `syntheticQuiz` from question IDs)
- `src/app/quiz/srs-review/page.tsx` (builds `syntheticQuiz` from question IDs)

Create a shared helper (choose one):

- Option A: `src/db/aggregatedQuiz.ts` (preferred: DB-layer helper)
- Option B: `src/lib/quiz/aggregatedQuiz.ts`

Inputs:

- `effectiveUserId`
- `questionIds: string[]`
- (optional) `title` (derive from `result.category_breakdown` keys or from stored topic category if available)

Behavior:

- Load all relevant quizzes (at least user-owned; consider including `NIL_UUID` if Topic Study can include system quizzes).
- Build `Map<questionId, {question, quiz}>` and return:
  - `syntheticQuiz: Quiz` with `questions` = ordered question list
  - `sourceQuizByQuestionId: Map<string, Quiz>` or map to quiz titles (for UI labeling later)

Edge cases:

- Some questions may no longer exist (quiz deleted, question removed): keep the ones that exist; surface a warning in UI like “Some questions could not be loaded”.
- `result.question_ids` missing: fall back to a minimal results summary UI.

### 1.2 Use the helper in Results Page routing

In `src/app/results/[id]/page.tsx`, when a result is aggregated:

- Detect aggregated by `isSRSQuiz(result.quiz_id, effectiveUserId)` (or equivalent).
- Instead of rendering ResultsContainer with the raw SRS quiz (empty questions), render with the synthetic quiz.

Preferred integration point:

- Add a hook in `src/hooks/useDatabase.ts` like `useResultWithHydratedQuiz(resultId, userId)` that returns:
  - `result`
  - `quiz` (normal) OR `syntheticQuiz` (aggregated)
  - loading/error states
- This centralizes the “hydrate aggregated results” logic.

### 1.3 Ensure grading and stats line up

Once `quiz.questions` is populated with the real questions:

- `useQuizGrading()` should compute correct/incorrect counts correctly.
- Question review list should populate.

Regression check:

- Normal quiz results rendering unchanged.

---

## Phase 2 — Make Analytics Count Aggregated Sessions (Minimal Changes)

Goal: Topic Study / SRS Review attempts should affect:

- Weak Areas (category performance)
- Topic heatmap
- Category trends (already uses `category_breakdown` and likely works if breakdown exists)
- Exam readiness

### 2.1 Fix “quizzes map doesn’t include the quiz referenced by result”

Right now analytics hooks receive `quizzes` from `useQuizzes()` which excludes SRS quizzes by design.
Two safe patterns:

#### Pattern A (recommended): analytics should not require the SRS quiz to exist

- When iterating results:
  - If `quizMap.get(result.quiz_id)` is missing OR the quiz has no questions AND `result.question_ids` exists:
    - Hydrate questions using the shared helper from Phase 1.
    - Evaluate correctness using the hydrated question list (same logic used elsewhere: compare `hashAnswer(userAnswer)` vs `question.correct_answer_hash`).

#### Pattern B: pass “all quizzes including SRS” into analytics hooks

- Create another hook `useAllUserQuizzesForAnalytics(userId)` that includes:
  - user quizzes (non-deleted)
  - optionally system quizzes (`NIL_UUID`)
  - and does NOT filter out SRS quiz
- Use this on Analytics page instead of `useQuizzes`.
  Downside: slightly more data in memory; upside: simpler changes in hooks.

### 2.2 Update specific analytics implementations

These currently ignore aggregated results due to missing questions:

- `src/hooks/useAnalyticsStats.ts` (weak areas + daily time)
- `src/components/analytics/TopicHeatmap.tsx`
- `src/db/results.ts:getOverallStats` (weakest categories; used by `AnalyticsOverview`)
- `src/db/results.ts:getTopicStudyQuestions` (question selection for “Study This Topic”)

For each:

- Add an “aggregated result” branch:
  - If the result has `question_ids`, evaluate only those questions.
  - If the result’s quiz has no questions (SRS), resolve questions by ID across quizzes.

Performance considerations:

- Build a single `Map<questionId, Question>` once per calculation instead of scanning quizzes per result.
- Cache `hashAnswer(answer)` results (many repeats).

### 2.3 Ensure Topic Study sessions reduce “weakness” as expected

Once aggregated results are counted toward category correctness totals:

- A 100% Topic Study session should raise the category’s computed performance (weak areas, heatmap).
- `getTopicStudyQuestions()` should stop returning those questions as “missed” if the user gets them correct in later sessions.

---

## Phase 3 — Optional: Align Normal Quiz Submission With Fire‑and‑Forget Sync

Current:

- Normal results use `await sync()` before navigation (`src/hooks/useQuizSubmission.ts`), which can add latency.
  SRS/Topic now use fire‑and‑forget.

Recommendation:

- Switch normal completion to fire‑and‑forget too for consistent offline‑first UX:
  - Save locally
  - `void sync().catch(...)`
  - navigate immediately

Guardrails:

- Don’t change correctness semantics (result must be saved before sync starts).
- Keep “save succeeded” toast separate from “sync succeeded” toast; the Unsynced badge remains the indicator.

---

## Phase 4 (Ideal / Best Practice): Persist Per‑Question Outcomes (Schema Upgrade)

If Phase 2 feels too expensive or too dependent on mutable quiz content, persist stable analytics primitives in the result itself.

### Option: Add `question_outcomes` (recommended)

Add to `Result`:

- `question_outcomes: Array<{ question_id: string; category: string; is_correct: boolean; source_quiz_id?: string }>`

Pros:

- Immutable snapshot (analytics won’t change if quizzes/questions are edited later).
- Analytics becomes fast and doesn’t need to re-resolve questions/hashes.
- Results UI can render review even if source quiz deleted (still can’t show full prompt/options unless you store them, but you can still show counts and categories).

Cons:

- Larger result payloads; requires Dexie + Supabase migrations and sync payload updates.

Implementation steps:

1. Update `src/types/result.ts` with the new field (optional at first; backfill defaults).
2. Update Dexie schema version in `src/db/index.ts` to include the field (no new index needed).
3. Update Supabase migration to add `question_outcomes jsonb not null default '[]'`.
4. Update sync push/pull in `src/lib/sync/syncManager.ts`:
   - include `question_outcomes` in upsert payload and select list.
   - extend `RemoteResultSchema` to accept it.
5. Update creation code paths:
   - Normal: build outcomes from quiz questions + answers.
   - Topic Study/SRS: build outcomes from the aggregated question list already in memory at completion time.

Once in place, rewrite analytics to use `question_outcomes` primarily, with fallback to legacy calculation for older rows.

---

## Testing / Validation Checklist

### Unit tests (fast)

- Keep: `npm test -- tests/unit/syncManager.test.ts`
- Add tests for new helper:
  - Hydrates aggregated quiz from question IDs
  - Handles missing questions gracefully
- Add tests for analytics counting aggregated results:
  - A Topic Study result changes computed category correctness totals.

### Manual validation (critical UX)

1. Topic Study → finish → results page:
   - Correct/incorrect counts match score
   - Question review list populated
   - Category breakdown present
   - Unsynced badge clears automatically when online
2. Analytics:
   - Weak area score improves after 100% Topic Study
   - Heatmap reflects improvement in that category/week
   - Trends include new attempt

---

## Key Files / Entry Points

- Completion + saving:
  - `src/components/quiz/ZenQuizContainer.tsx`
  - `src/hooks/useQuizSubmission.ts`
  - `src/db/results.ts`
- Results UI:
  - `src/app/results/[id]/page.tsx`
  - `src/components/results/ResultsContainer.tsx`
- Topic Study construction:
  - `src/app/quiz/topic-review/page.tsx`
  - `src/components/analytics/WeakAreasCard.tsx`
  - `src/db/results.ts:getTopicStudyQuestions`
- Analytics computations:
  - `src/hooks/useAnalyticsStats.ts`
  - `src/components/analytics/TopicHeatmap.tsx`
  - `src/hooks/useAdvancedAnalytics.ts`
  - `src/hooks/useCategoryTrends.ts`
  - `src/db/results.ts:getOverallStats`

---

## Acceptance Criteria

- Topic Study and SRS Review results pages show correct counts and populate review UI.
- Topic Study and SRS Review attempts materially affect Weak Areas and mastery/heatmap analytics.
- Sync remains offline‑first and automatic; manual “Sync” remains as an override, not a requirement.
