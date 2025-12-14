# Review Guide: Topic Study + SRS Review Integration (Results UI + Analytics)

## Navigation (Fast Jump)

- Acceptance criteria: What “Done” Means
- Manual validation: End-to-end behaviors (online/offline)
- Dexie integrity: confirm local truth
- Analytics validation: weak areas + heatmap + trends
- Sync validation: background, manual, multi-tab, blocked sync
- Security review: RLS + deterministic IDs + no direct Supabase writes from UI
- Performance review: avoid O(n³) and UI freezes
- Regression matrix: normal quiz + smart round + proctor + deletion
- Code review checklist: PR-level verification + greps
- Troubleshooting playbook: what to do when something fails
- Final sign-off template: record evidence

## Persona

You are a **Senior Reviewer / QA Engineer** with deep expertise in:

- Offline-first architectures (Dexie/IndexedDB as source of truth)
- Supabase Postgres (UUID columns, foreign keys) + RLS correctness
- React/Next.js rendering and async state flow
- Analytics correctness + performance profiling

Your mission is to **verify** that the implementation described in:

- `docs/PLAN_TOPIC_STUDY_SRS_INTEGRATION.md`

is complete, correct, secure, and doesn’t regress existing flows.

This doc is intentionally **procedural and exhaustive** so you can validate with minimal additional planning.

---

## What “Done” Means (Acceptance Criteria)

### Results UI

- Topic Study and SRS Review results pages render meaningful content:
  - Correct / incorrect / unanswered counts match actual answers.
  - Question review list is populated when possible.
  - Category breakdown and any session-specific metadata render sensibly.
- No “100% score but 0 correct” inconsistencies.

### Analytics

- Topic Study + SRS Review attempts materially affect:
  - Weak Areas scores (improve as user performs better)
  - Topic mastery heatmap
  - Exam readiness / category readiness
  - Category trend charts (if `category_breakdown` is present)
- “Study This Topic” selection logic stops surfacing questions that the user is now getting correct (or flagged/missed logic remains accurate).

### Sync / Offline-first behavior

- Finishing a session saves locally first and navigates immediately.
- When online, the Unsynced badge clears on its own (background sync).
- When offline or sync blocked, Unsynced remains and manual sync still works.
- UI **never writes directly to Supabase** from components; only via the sync orchestration.

---

## Context You Should Keep In Mind

### Why this was broken historically

- Aggregated sessions (Topic Study / SRS Review) use a per-user “SRS quiz” as the parent `quiz_id` for results FK compliance.
- The SRS quiz record in Dexie has `questions: []`, so:
  - Results grading and question review UI (which expects `quiz.questions`) lacked data.
  - Analytics that builds a `quizMap` from `useQuizzes()` (which filters out SRS quizzes) could not associate aggregated results with questions, so category correctness never improved.

### Important existing design choices

- `useQuizzes()` filters out SRS quizzes intentionally for library UX.
- Analytics hooks often rely on `quizMap.get(result.quiz_id)` and per-question hashing comparisons.
- Aggregated results do store `question_ids` and `answers` (so it’s possible to hydrate questions by ID).

---

## Pre-Review Setup

### 1) Confirm repo + environment

- Sandbox/approvals/network constraints don’t matter much for review, but note them.
- Confirm you’re on the branch with the implementation applied.

### 2) Required baseline commands (run before manual QA)

- Type check: `npm run typecheck`
- Unit tests (required): `npm test -- tests/unit/syncManager.test.ts`

### 3) Recommended baseline commands (run if code touched the area)

- DB/quiz unit tests: `npm test -- tests/unit/db/quizzes.test.ts`
- Integration sync tests (if stable in your env): `npm test -- tests/integration/sync.test.ts`
- Lint (especially if touching hooks/components): `npm run lint`
- Build sanity check (optional but strong signal): `npm run build`

### 4) Evidence collection (make review actionable)

Capture these artifacts while testing:

- Screenshot or short screen recording of:
  - Topic Study results page with correct counts + question list
  - Analytics weak area score before/after improvement
- DevTools Console export (filter warnings/errors; include any “Background sync failed…” lines)
- DevTools Network export (HAR or at least screenshots of Supabase requests + 2xx/4xx)
- IndexedDB screenshots showing the relevant `results` row fields (`quiz_id`, `question_ids`, `answers`, `synced`)

### 5) Baseline invariants to keep in mind (quick mental model)

- All result creation must:
  - write to Dexie first (`synced: 0`)
  - never depend on network for completion/navigation
- Sync is the only code path that writes to Supabase.
- Results UI and analytics should be derived from local data, and should be resilient to:
  - quiz deleted/soft-deleted
  - question removed
  - partial sync (quiz synced but result not yet, and vice versa)

---

## Review Workflow (Best Practice)

### A) Use Codanna before reading code manually

1. Find relevant symbols and entry points:
   - Results UI: `ResultsContainer`, results page route, any “hydrated quiz” helper.
   - Topic Study: `getTopicStudyQuestions`, `WeakAreasCard`, topic review route.
   - Analytics: `useAnalyticsStats`, `TopicHeatmap`, `useAdvancedAnalytics`, `useCategoryTrends`, `getOverallStats`.
2. Use `analyze_impact` on any new helper/hook introduced by the implementer to ensure there aren’t missed call sites or unintended breakages.

### B) Validate behavior manually in the app

Do this **before** arguing about code style.

### C) Then do a structured PR/diff review

After manual verification, review the implementation in this order:

1. Data correctness (Dexie schema, result creation, question resolution)
2. UI correctness (results page hydration, stats derivation)
3. Analytics correctness (aggregated sessions counted properly)
4. Sync correctness (FK gating, cursors, migration ordering)
5. Security + performance

---

## Manual Validation (Step-by-step)

### 0) Sanity: confirm you’re testing the intended flow

- Topic Study must be started via Analytics → Weak Areas → “Study This Topic”
- SRS Review must be started via the Study Due / SRS review flow
- Ensure you’re logged in as the intended test user (auth mismatch can cause “sync skipped”)

### 1) Topic Study results page is complete

Repro:

1. Go to Analytics → Weak Areas.
2. Click “Study This Topic” on a known category.
3. Finish the Topic Study session with a known outcome:
   - First run: answer all correct (100%).
   - Second run: intentionally miss a couple (so counts are non-trivial).
4. On the results page (`/results/:id`), verify:
   - The score matches actual answers (100% when all correct).
   - Correct/incorrect/unanswered counts match (no 0 correct when 100%).
   - Question review list shows the real questions (not empty).
   - Category breakdown makes sense for the session.
   - Any “study session title” logic is correct and stable.

What to look for in DevTools:

- Console errors/warnings (especially missing questions).
- Network calls should be sync-related only (no direct Supabase writes from UI).

Extra correctness checks:

- Question count on results page equals `result.question_ids.length` (for aggregated sessions).
- “Answered” count equals number of keys in `result.answers` that are non-empty.
- If a question is missing (can’t be resolved from local quizzes), UI should degrade gracefully:
  - no crash
  - show partial review list + a notice if appropriate

### 2) SRS Review results page is complete

Repro:

1. Go to the SRS Review flow (Study Due → Start review).
2. Finish a session with known outcomes.
3. On results page, verify the same criteria as Topic Study:
   - Correct counts match.
   - Review list populated.

### 3) Unsynced badge clears automatically when online

Repro:

1. Ensure you are logged in and online.
2. Complete a Topic Study or SRS Review session.
3. On results page:
   - Unsynced badge may appear briefly.
   - It should clear without you clicking it, once background sync completes.

Also verify:

- Manual “Sync” button still works (if present).
- The badge clears based on Dexie updates (live query), not a hard refresh.

Network validation (important):

- In DevTools Network (filter “supabase”), confirm:
  - quiz upsert request(s) succeed (2xx)
  - results upsert request(s) succeed (2xx)
  - there are no repeated failures that indicate an infinite retry loop

### 4) Offline behavior remains correct

Repro:

1. Go offline in DevTools.
2. Complete Topic Study and/or SRS Review.
3. Results page should load (local-first).
4. Unsynced badge should remain (expected).
5. Go back online and trigger a sync (either automatic retry if implemented, or click manual sync):
   - Badge should clear after successful sync.

Edge case: Sync blocked state

- If the app has a “sync blocked” UI or state (schema drift protection), confirm:
  - user sees an informative message
  - the app doesn’t hammer network retries
  - completion still works locally

### 5) Analytics improve after doing well in Topic Study / SRS

This is the key product integration requirement.

Repro:

1. Note a category in Weak Areas with a low score.
2. Start Topic Study for that category and score high multiple times.
3. Return to Analytics and confirm:
   - Weak Areas score for that category improves (or drops out of weak areas if > threshold).
   - Topic heatmap shows improved scores in recent weeks.
   - Exam readiness/category readiness improves (if enough data).
   - Category trend chart includes new points.

If analytics do not update:

- Check whether analytics uses `quizMap.get(result.quiz_id)` and is failing to resolve aggregated results due to filtered quizzes.
- Check whether a “hydrate question IDs” path was implemented for analytics.

Stronger verification (reduces false positives):

- Pick a category with a small number of questions to make the math obvious.
- Track expected before/after correct counts:
  - Do a Topic Study run with all correct.
  - Confirm category score moves in the expected direction (even if it’s smoothed/averaged).

### 6) Cross-session consistency (repeatability)

Repro:

- Run Topic Study on the same category multiple times:
  - once with poor performance
  - once with high performance
- Verify:
  - weak area trend reads “improving” when appropriate (if trend logic exists)
  - the category drops from weak areas if it crosses threshold

### 7) “Study This Topic” question selection stays correct after improvement

This validates the loop that powers Topic Study itself:

1. Run Topic Study and deliberately miss/flag certain questions.
2. Confirm `WeakAreasCard` still offers the category and provides questions.
3. Run Topic Study again and get those questions correct (and unflag them).
4. Confirm future Topic Study sessions in that category reduce or eliminate those questions as “missed”.

---

## Data Integrity Checks (Dexie)

Use DevTools → Application → IndexedDB → `CertPrepDatabase`.

Verify these for a freshly completed Topic Study / SRS Review result:

- `results` row:
  - `quiz_id` is the per-user deterministic SRS quiz UUID (not `srs-{userId}`)
  - `question_ids` exists and has N entries
  - `answers` has keys that match those `question_ids`
  - `category_breakdown` exists for trends/readiness (optional but recommended)
  - `synced` flips from `0` to `1` after sync when online
- `quizzes` row for the SRS quiz:
  - exists and has `questions: []` (expected for the parent)
  - `last_synced_at` becomes non-null after successful quiz sync

If the implementation introduced a “hydrated quiz” helper:

- Verify it does not mutate canonical quiz records unexpectedly.
- Verify it does not persist synthetic quizzes into Dexie unless explicitly intended.

Additional Dexie integrity checks:

- Confirm the `results` row is not missing required fields:
  - `user_id`, `timestamp`, `mode`, `time_taken_seconds`, `flagged_questions`, `category_breakdown`
- Confirm soft delete behavior still holds:
  - `deleted_at` remains `null` for active results
  - deleting a result sets `deleted_at` locally and sync pushes the deletion
- Confirm the SRS quiz row:
  - `user_id` matches current user
  - `last_synced_at` updates after successful quiz sync

---

## Regression Test Matrix (Must Not Break)

### Normal “Zen” quiz attempt

- Finish a regular quiz.
- Ensure results UI still works, and navigation isn’t blocked by network.
- Ensure Unsynced badge still behaves sensibly (may flash, should clear when online).

### Smart Round

- Finish a Smart Round attempt.
- Ensure results show correct subset question grading (uses `question_ids`).

### Proctor exam

- Submit normally and via auto-submit.
- Ensure save + navigation works even if sync fails.

### Deleting a result

- Delete a result; ensure the app still performs a sync to propagate deletion (this may intentionally `await sync`).

### Multi-tab behavior

- Trigger sync in two tabs; ensure locking doesn’t cause odd UI states (especially for “sync on completion”).

### Guest user / NIL_UUID behavior (if supported)

- If the app supports a guest mode or NIL_UUID-owned quizzes:
  - Ensure Topic Study/SRS flows behave predictably (either disabled, or correctly attributed to an effective user).
  - Ensure results created under NIL_UUID do not attempt to sync as a real user.

### Quiz edits and question drift

- Edit a quiz question after taking a result (if the product supports editing).
- Verify:
  - Results page does not crash.
  - If grading is derived from current quiz state, note whether it’s acceptable (and file an issue if not).

---

## Security / RLS Review (Must Not Regress)

### 1) No direct Supabase writes from UI components

Confirm:

- UI components only call `useSync().sync()` or wrappers; they should not call `createClient().from(...)` for writes.
- The sync managers remain the only layer performing upserts.

Recommended greps (run locally):

- Ensure no components write directly:
  - `rg "createClient\\(\\).*from\\(" src/components src/app`
  - `rg "\\.from\\(\"(results|quizzes|srs)\"\\)\\.(insert|upsert|update|delete)" src/components src/app`
- Ensure only sync layer writes:
  - `rg "\\.from\\(\"(results|quizzes|srs)\"\\)\\.(insert|upsert|update|delete)" src/lib/sync`

### 2) Deterministic SRS ID implications

Because SRS quiz IDs are deterministic UUID v5 derived from `userId`, verify the team’s intended security posture:

- With current RLS policies on `results` (insert allowed if `results.user_id == auth.uid()`), a user could theoretically insert their own result referencing another user’s quiz_id (if they can guess it).
- This doesn’t grant access to the other user’s data, but can create “foreign reference noise” unless you enforce quiz ownership at insert time.

Recommendation to flag (server-side):

- Update `results` insert/update policies to require that referenced `quiz_id` belongs to the inserting user:
  - `exists(select 1 from quizzes where quizzes.id = results.quiz_id and quizzes.user_id = auth.uid())`

As reviewer:

- If the implementer touched RLS or migrations, validate them carefully (and ensure they don’t block legitimate sync).

### 3) Validate auth-user mismatch handling

The sync layer should skip or fail gracefully if:

- no auth session exists
- auth session user does not match the userId being synced

Manual check:

- Log out, refresh, confirm sync doesn’t throw.
- Log in as User A, then (in another tab) log in as User B, confirm neither corrupts the other’s local data.

---

## Performance Review (Avoid UI Freezes)

Key risks:

- Hydrating questions for aggregated results can become O(#results × #allQuizzes × #questions).
- Analytics code already does hashing; ensure caching/batching exists where appropriate.

Checklist:

- If a “hydrate aggregated questions” helper exists:
  - It should build a single `Map<questionId, question>` and reuse it.
  - It should avoid repeatedly scanning all quizzes per result.
- Analytics updates should not re-run expensive computations unnecessarily:
  - Check memoization keys.
  - Ensure “resultsHash” / “quizzesHash” changes are meaningful and not over-triggering.
- Confirm no unbounded `Promise.all` over huge arrays on the main thread.

Optional:

- Use the Performance panel to record finishing a session and loading analytics.

Additional performance checklist:

- Hydration logic should run only for aggregated results, not all results.
- Analytics calculations should be debounced/memoized appropriately (avoid re-running on every sync tick).
- Ensure hash computations are cached where repeated (answers often reuse small option keys).

---

## UX / Accessibility Review (Quick but Important)

- Unsynced badge / sync actions:
  - Button is keyboard reachable and has an accessible label.
  - While syncing, UI indicates progress and prevents duplicate clicks.
- Results page long content:
  - No horizontal scrolling introduced; long text breaks correctly.
- Error states:
  - Missing quiz/question data shows a clear message, not a blank panel.

---

## Code Review Checklist (What to Look For in PR)

### 0) Scope discipline (best practice)

- Changes should be localized to Topic Study/SRS + analytics + results UI.
- No unrelated refactors that increase risk (unless justified).

### Results UI integration

- Any new “hydrated quiz” helper should:
  - be deterministic and side-effect safe
  - handle missing questions gracefully
  - avoid storing synthetic quizzes permanently (unless explicitly required)
  - avoid relying on tags/title heuristics that could misclassify user quizzes

### Analytics integration

- Ensure aggregated results contribute to category performance computations by resolving questions from `result.question_ids` even when `quizMap.get(result.quiz_id)` fails.
- Ensure the “Study This Topic” selection (`getTopicStudyQuestions`) correctly updates as user improves.
- Ensure analytics logic does not silently drop aggregated results due to `useQuizzes()` filtering.

### Sync behavior

- “Fire-and-forget” `sync()` is consistently used on completion flows (save first, then `void sync()`).
- Manual sync paths still `await` and show correct toasts.
- Verify FK pre-flight behavior:
  - Results are not pushed before their parent quiz is synced.
  - Sync still performs pull even if push is incomplete/skipped.

### Logging

- Any debug logging should be dev-only and should not leak sensitive info.

### Type safety + nullability

- No `any` introduced.
- New code handles missing `question_ids`, missing quizzes, and deleted quizzes without crashing.

### Determinism + ordering

- If building synthetic quizzes:
  - question order matches the session order (question_ids order)
  - duplicates are handled sensibly (dedupe or stable mapping)

---

## Troubleshooting Playbook (If Something Fails)

### Symptom: Results page still missing questions

Likely causes:

- The app is still using the SRS parent quiz (empty questions) instead of a synthetic quiz.
- `result.question_ids` missing or not used.
- Question resolution is incorrectly scoped (e.g., only user quizzes, but questions came from system quizzes).

Actions:

- Inspect the `results` row’s `question_ids` and `answers`.
- Confirm the hydration helper is called for aggregated results.

### Symptom: Analytics still not improving

Likely causes:

- Analytics is using `useQuizzes()` output which excludes SRS quiz and thus drops aggregated results.
- Hydration path exists but is not wired into analytics calculations.

Actions:

- Search for `quizMap.get(result.quiz_id)` patterns in analytics; ensure aggregated fallback exists.
- Confirm computed weak areas depend on per-question correctness (not only `result.score`).

### Symptom: Badge doesn’t clear automatically even when online

Likely causes:

- Background sync isn’t triggered on completion, or it errors.
- Quiz sync fails, so results are skipped due to FK pre-flight.

Actions:

- Check console warnings from the fire-and-forget sync call.
- Check logs for quiz push errors.

### Symptom: Analytics numbers “look wrong” (not just “not improving”)

Likely causes:

- Session questions mismatch (analytics is counting all quiz questions instead of `question_ids` subset).
- Answer hashing logic differs from other code paths (hash vs raw compare).
- Category name normalization mismatch (“Uncategorized” handling).

Actions:

- Pick a tiny dataset (1 quiz, 2 questions) and compute expected correct/total by hand.
- Confirm analytics counts match by instrumenting only in dev (no prod logs).

### Symptom: UI shows different grading than analytics

Likely causes:

- Results page uses hydrated questions; analytics uses category_breakdown or vice versa.
- One path is using `evaluateAnswer()` and another is using hash compare.

Actions:

- Ensure both use the same correctness evaluator (or that any differences are intentional).

---

## Final Sign-off Template (Fill This In)

- Reviewer: (name/date)
- App version/branch: (commit hash)
- Test user(s): (IDs/emails redacted)
- Environment: (local / preview / prod)
- Evidence links: (screenshots/HAR/notes)

- Results UI (Topic Study): ✅/❌ (notes)
- Results UI (SRS Review): ✅/❌ (notes)
- Analytics updates from Topic Study: ✅/❌ (notes)
- Sync behavior (online + offline): ✅/❌ (notes)
- Regression (normal quiz / smart / proctor): ✅/❌ (notes)
- Security concerns found: ✅/❌ (notes)
- Performance concerns found: ✅/❌ (notes)
