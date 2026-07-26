# Zen Draft Suggestion Remediation

Status: completed
Owner: Codex
Last Reviewed: 2026-07-26

## Objective

Implement the accepted and modified findings from the post-feature Zen draft
review, including persistence-safe conflict completion, typed result failure
semantics, dashboard launch integrity, empty-quiz handling, focused regression
coverage, and accurate release notes.

## Risk And Locked Decisions

- Tier 2: this change touches device-local persistence, session completion,
  cross-tab ownership, dashboard navigation, and authenticated E2E behavior.
- A tab that loses draft ownership must never reclaim, overwrite, or delete the
  newer writer's draft implicitly.
- A conflicted tab may complete its in-memory attempt by appending a result
  without touching the newer draft.
- Permanent completion failures are modeled with typed codes and never exposed
  as retryable transient save errors.
- Standard Zen quizzes require at least one question. Empty aggregate/system
  containers remain supported outside the standard-Zen launch path.
- Compatible drafts continue to require an explicit Resume or Start Over
  decision. Other quiz modes remain accessible from a card with a saved draft.
- `seenQuestions` remains Proctor-owned and is not added to Zen draft hydration.
- No compatibility shims, alternate draft paths, remote draft synchronization,
  or silent conflict reclamation are permitted.

## Impacted Boundaries

- `src/db/results.ts`
- `src/hooks/useQuizSubmission.ts`
- `src/hooks/useExamSubmission.ts`
- `src/components/quiz/ZenQuizContainer.tsx`
- `src/components/quiz/hooks/useZenDraftSession.ts`
- `src/components/quiz/hooks/useQuizSession.ts`
- `src/stores/quizSessionStore.ts`
- Dashboard cards, grid status mapping, and release documentation
- Focused unit tests and authenticated Zen draft E2E coverage

## Verification Gates

1. Focused unit tests for result error classification, conflict completion,
   empty quizzes, hydration invariants, dashboard mappings, and cleanup.
2. Focused authenticated Zen draft Playwright coverage when prerequisites are
   available.
3. `npm run verify`.
4. `npm run security-check`.
5. `npm run test:security-check`.
6. `npm run build`.
7. `npm run test:e2e` because authenticated draft/completion behavior changes.
8. `git diff --check`, adversarial self-review, and staged secret scan.

## Rollback

Revert the remediation commit. No Dexie schema or stored-record migration is
introduced. Existing v17 drafts remain readable by the prior implementation,
although reverting would restore the known conflicted-completion deadlock.

## Results

- Added typed permanent result-completion failures and restricted retries to
  transient storage failures.
- Detached conflicted tabs from draft ownership while allowing their valid
  in-memory attempts to append results without mutating the newer draft.
- Added explicit permanent-failure dashboard recovery that bypasses unsafe
  draft writes and cannot trap the user on the completion screen.
- Preserved standard drafts when entering Proctor or remixed Zen, restored
  alternate mode selection beside Continue Quiz, and hardened hydration,
  deleted-quiz, empty-quiz, and stable-fallback invariants.
- Added focused unit and E2E regression coverage and updated the architecture
  contract and release notes.

## Verification Evidence

- `npm run verify`: 146 files passed, 1 skipped; 909 tests passed, 3 skipped.
- `npm run security-check`: passed across 535 text files.
- `npm run test:security-check`: 16 checks passed.
- `npm run build`: production build and TypeScript validation passed.
- `npx playwright test tests/e2e/zen-draft.spec.ts`: 8 passed.
- `npm run test:e2e`: 120 passed, 2 skipped.
- `git diff --check`: passed before staging.
