# Submission And Draft-Status Hardening

Status: completed
Owner: Codex
Last Reviewed: 2026-07-26

## Objective

Implement the accepted review findings for Proctor auto-submit failure semantics
and dashboard Zen-draft status availability without weakening the offline-first
persistence boundary or creating a permanent loading state.

## Risk And Locked Decisions

- Tier 2: this change touches device-local persistence status, quiz launch
  gating, session completion feedback, and dashboard navigation.
- Permanent Proctor completion failures must retain their existing specific
  toast and dashboard redirect and must never receive a retry toast.
- Retryable Proctor failures retain the existing manual-retry path.
- Draft-status absence means "no draft" only after a successful classification
  read. Query-level failures make all launch actions unavailable.
- Individual assessment failures preserve healthy classifications but make the
  affected quiz launch action unavailable.
- Settled failures render an explicit retry state rather than an indefinite
  dashboard skeleton.
- Retry re-runs the existing reactive query; it does not introduce a second
  persistence path, compatibility shim, or remote fallback.

## Impacted Boundaries

- `src/hooks/useExamSubmission.ts`
- `src/components/quiz/ProctorQuizContainer.tsx`
- `src/hooks/useDatabase.ts`
- `src/components/dashboard/DashboardClient.tsx`
- `src/components/dashboard/QuizGrid.tsx`
- `src/components/dashboard/QuizCard.tsx`
- Focused unit tests for the hooks and dashboard/card consumers
- `docs/ARCHITECTURE.md`
- Supersession note in `docs/plans/2026-07-22-zen-draft-review-remediation.md`

## Verification Gates

1. Focused unit tests for Proctor outcome classification and draft-status
   loading, partial failure, global failure, disabled actions, and retry.
2. `npm run verify`.
3. `npm run security-check`.
4. `npm run test:security-check`.
5. `npm run build`.
6. `npm run test:e2e` when the configured authenticated environment is
   available.
7. `git diff --check`, adversarial self-review, and commit-scoped status review.

## Rollback

Revert the implementation commit. No Dexie schema, stored-record migration,
remote contract, or compatibility path is introduced.

## Results

- Proctor auto-submit now returns a discriminated outcome for saved,
  retryable-failure, permanent-failure, and ignored calls. The time-up fallback
  adds generic retry guidance only for retryable failures.
- Dashboard draft classification now exposes query errors and per-quiz unknown
  assessments separately from confirmed absence.
- Query-level failures disable every quiz launch action; partial failures
  preserve healthy classifications and disable only affected quizzes.
- A dashboard retry re-runs the same versioned Dexie live query, and stale
  results remain unavailable while the new request is pending.
- Grid and card launch-availability inputs are explicit required contracts.
- Architecture, release notes, and the superseded partial/empty degradation
  decision now describe the current behavior.

## Verification Evidence

- Focused TypeScript and unit verification: 7 files passed; 63 tests passed.
- `npm run verify`: 146 files passed, 1 skipped; 917 tests passed, 3 skipped.
- `npm run security-check`: passed across 536 text files.
- `npm run test:security-check`: 16 checks passed.
- `npm run build`: production build and TypeScript validation passed.
- `npm run test:e2e`: 120 passed, 2 skipped.
- `git diff --check`: passed before staging.
