# Plan: Remediate `react-hooks/set-state-in-effect` (Spark-Executable)

> Status: active
> Owner: implementation worker (Codex Spark), reviewed by maintainer
> Last Reviewed: 2026-04-25
> Risk Tier: Tier 2 (cross-cutting UI/provider behavior)

## Objective

Resolve all current `react-hooks/set-state-in-effect` errors with deterministic edits so the worker does not make architecture decisions during implementation.

Do not commit. The maintainer will review the resulting diff first.

## Baseline Evidence (Captured 2026-04-25)

Source command used:

```bash
npx eslint . -f json > /tmp/eslint-set-state.json
node -e 'const fs=require("fs");const data=JSON.parse(fs.readFileSync("/tmp/eslint-set-state.json","utf8"));const out=[];for(const f of data){for(const m of f.messages){if(m.ruleId==="react-hooks/set-state-in-effect"){out.push(`${f.filePath}:${m.line}:${m.column}`)}}}console.log(out.join("\n"));console.log(`TOTAL=${out.length}`);'
```

Current inventory: **31 violations** across **22 files**.

Exact baseline locations:

```text
src/app/analytics/page.tsx:105:9
src/app/quiz/[id]/settings/page.tsx:51:13
src/app/quiz/[id]/zen/page.tsx:121:11
src/app/study-due/page.tsx:103:14
src/components/analytics/TopicHeatmap.tsx:226:9
src/components/common/InstallPrompt.tsx:25:7
src/components/common/OfflineIndicator.tsx:27:5
src/components/common/OfflineIndicator.tsx:32:7
src/components/common/OfflineIndicator.tsx:43:7
src/components/common/SyncBlockedBanner.tsx:18:7
src/components/common/ThemeProvider.tsx:204:5
src/components/common/ThemeProvider.tsx:224:9
src/components/common/ThemeProvider.tsx:250:5
src/components/dashboard/ImportModal.tsx:187:7
src/components/dashboard/ImportModal.tsx:202:7
src/components/dashboard/ModeSelectModal.tsx:96:7
src/components/dashboard/QuizCard.tsx:164:7
src/components/layout/Header.tsx:72:5
src/components/providers/AuthProvider.tsx:131:22
src/components/providers/SyncProvider.tsx:76:7
src/components/providers/SyncProvider.tsx:176:10
src/components/results/QuestionReviewCard.tsx:112:7
src/components/results/ResultsContainer.tsx:295:7
src/components/results/Scorecard.tsx:145:5
src/components/results/Scorecard.tsx:155:7
src/components/settings/ProfileSettings.tsx:34:7
src/components/srs/ReviewModeModal.tsx:75:13
src/hooks/useCorrectAnswer.ts:111:5
src/hooks/useOnlineStatus.ts:32:5
src/hooks/useQuizGrading.ts:36:7
src/hooks/useResolveCorrectAnswers.ts:26:7
```

## Locked Decisions (Do Not Deviate)

1. Do not add new dependencies.
2. Do not globally disable `react-hooks/set-state-in-effect`.
3. Allowed inline suppressions are limited to these exact locations:
   - `src/components/common/ThemeProvider.tsx` mount guard (`setMounted(true)`).
   - `src/components/common/OfflineIndicator.tsx` mount guard (`setMounted(true)`).
   - `src/components/common/OfflineIndicator.tsx` reconnect banner transition (`setShowReconnected(true)`).
   - `src/components/common/OfflineIndicator.tsx` offline re-entry reset (`setDismissed(false)`).
4. For all other violations, fix code structure; do not suppress.
5. Keep public component APIs unchanged unless explicitly listed below.
6. Stop after edits and verification; do not commit.

## Execution Sequence

### Step 1: Apply exact per-file remediations

Implement in this order.

1. `src/app/analytics/page.tsx`
   - Remove the mount effect that reads localStorage and sets `dateRange`.
   - Initialize `dateRange` with a lazy `useState` initializer that reads `analytics-date-range` (with existing try/catch and `DATE_RANGE_VALUES` guard).

2. `src/app/quiz/[id]/settings/page.tsx`
   - Remove the `useEffect` that copies `quiz` fields into local state.
   - Extract the editable form into a child component rendered only when `quiz` exists.
   - Initialize child local state from `quiz` in `useState` initializers.

3. `src/app/quiz/[id]/zen/page.tsx`
   - Remove `studyModeData` and `filteredQuestions` state plus their state-setting effect.
   - Replace with memoized derived payload from `quiz + mode + sessionStorage`.
   - Keep redirect behavior (`router.replace`) in an effect that performs navigation only (no `setState` calls).

4. `src/app/study-due/page.tsx`
   - Keep `loadDueQuestions` as async loader.
   - In mount effect, schedule the initial call via timer callback and clean up timer:
     - `const timer = window.setTimeout(() => { void loadDueQuestions(); }, 0);`
     - cleanup `window.clearTimeout(timer)`.
   - Do not call `loadDueQuestions()` directly in effect body.

5. `src/components/analytics/TopicHeatmap.tsx`
   - Remove effect that resets `collapsedGroups` on `sortMode`.
   - Add `handleSortModeChange(nextMode)` helper that sets `sortMode` and resets `collapsedGroups`.
   - Replace every direct `setSortMode(...)` call with `handleSortModeChange(...)`.

6. `src/components/common/InstallPrompt.tsx`
   - Remove direct `setIsInstalled(...)` and `setDismissed(...)` from mount effect.
   - Initialize `isInstalled` and `dismissed` using lazy state initializers with existing storage/display-mode checks.
   - Keep event listener updates (`beforeinstallprompt`, `appinstalled`) as callback-based state updates.

7. `src/components/common/OfflineIndicator.tsx`
   - Keep existing behavior and timing semantics unchanged.
   - Apply localized suppressions at the three approved lines listed in Locked Decisions.
   - Do not introduce additional suppressions in this file.

8. `src/components/common/SyncBlockedBanner.tsx`
   - Remove effect that resets `dismissed` when `syncBlocked` changes.
   - Replace boolean `dismissed` with dismissal keyed to current block identity (reason + blockedAt + tables).
   - Banner visibility should derive from key comparison, no reset effect.

9. `src/components/common/ThemeProvider.tsx`
   - Keep mount hydration guard and add localized suppression on `setMounted(true)`.
   - Move initial `theme`, `comfortMode`, and `systemTheme` reads to lazy initializers.
   - Remove direct initial `setComfortModeState(...)` and `setSystemTheme(...)` calls from effects.
   - Keep media query listeners updating state in callbacks.

10. `src/components/dashboard/ImportModal.tsx`
    - Remove effect branch that clears validation state when `jsonText` is empty.
    - Clear parse/validation/warnings immediately in the JSON input/file handlers when text becomes empty.
    - Remove effect that calls `resetState()` on close.
    - Create `handleCloseModal` wrapper: call `resetState()` then `onClose()`. Use it for all modal close paths.

11. `src/components/dashboard/ModeSelectModal.tsx`
    - Remove effect that resets `selectedMode` on open.
    - Reset `selectedMode` to default inside a close wrapper (`handleCloseModal`) used by cancel/overlay/escape close path.

12. `src/components/dashboard/QuizCard.tsx`
    - Remove effect that sets `focusedMenuIndex` when menu opens.
    - Set `focusedMenuIndex(0)` in the exact user action that opens the menu.
    - Keep focus-to-first-item behavior in animation frame callback after opening.

13. `src/components/layout/Header.tsx`
    - Remove effect that closes menu on route change.
    - Replace `isMenuOpen` boolean state with pathname-anchored open state (menu considered open only for the pathname where it was opened).
    - Route change should implicitly close menu via derived state, without effect setState.

14. `src/components/providers/AuthProvider.tsx`
    - Remove direct `setIsLoading(false)` in the `!supabase` branch.
    - Initialize `isLoading` from `Boolean(supabase)` and keep existing async auth flow.

15. `src/components/providers/SyncProvider.tsx`
    - In `userId` effect, remove direct state resets on logout (`setHasInitialSyncCompleted`, `setInitialSyncError`).
    - Expose user-scoped derived values to context (`false/null` when no user).
    - For block polling effect, do not directly call `computeBlockedInfo()` in effect body; schedule first run via timer callback and keep interval callback.

16. `src/components/results/QuestionReviewCard.tsx`
    - Remove effect syncing `isExpanded` from `expandAllSignal`.
    - Initialize card expansion from props on mount only.
    - Keep local toggle behavior unchanged.

17. `src/components/results/QuestionReviewList.tsx`
    - Update card key to include `expandAllSignal` so expand/collapse-all remounts cards with new initial expansion state.

18. `src/components/results/ResultsContainer.tsx`
    - Remove effect that auto-sets `questionFilter` and `autoFilterApplied`.
    - Replace with derived effective filter logic plus explicit user override path in handler.
    - Keep behavior: incorrect-first auto focus until user explicitly chooses a filter.

19. `src/components/results/Scorecard.tsx`
    - In `useAnimatedScore`, initialize `prefersReducedMotion` lazily from media query.
    - Remove direct `setDisplayValue(target)` from effect.
    - Return `target` directly when reduced motion is enabled; keep animation state for non-reduced mode.

20. `src/components/settings/ProfileSettings.tsx`
    - Remove effect that copies auth user into local editable state.
    - Extract editable form into user-keyed child component and initialize local fields from user in initializers.

21. `src/components/srs/ReviewModeModal.tsx`
    - Remove open-reset effect for selected mode.
    - Reset mode in close wrapper used by all modal close paths.

22. `src/hooks/useCorrectAnswer.ts`
    - Remove `setWorkerFailed(false)` from worker lifecycle effect start (state is already initialized).

23. `src/hooks/useOnlineStatus.ts`
    - Remove direct `setIsOnline(navigator.onLine)` from effect body.
    - Keep initial value from `useState` initializer and event listeners for updates.

24. `src/hooks/useQuizGrading.ts`
    - Remove early-effect `setGrading(null)` when no quiz/answers.
    - Return derived `grading/isLoading/error` values when quiz is absent (without effect-time setState).

25. `src/hooks/useResolveCorrectAnswers.ts`
    - Remove no-questions effect branch with direct `setResolved({})` and `setIsResolving(false)`.
    - Return derived empty/idle values when `questions.length === 0`.

### Step 2: Lint gate (must be clean)

Run:

```bash
npm run lint
```

Acceptance:

- 0 errors
- 0 warnings
- No new `eslint-disable` for this rule beyond the four explicitly allowed suppressions.

### Step 3: Required verification set (Tier 2)

Run in order:

```bash
npm run verify
npm run security-check
npm run build
```

If `npm run build` cannot run due environment limits, record exact limitation and stop before claiming full verification complete.

### Step 4: Handoff bundle for maintainer review

Provide:

1. `git diff --stat`
2. Exact list of changed files
3. `npm run lint` summary line
4. Verification command outcomes (`verify`, `security-check`, `build`)
5. Any allowed suppressions used, with file + line + justification comment text

Do not commit.
