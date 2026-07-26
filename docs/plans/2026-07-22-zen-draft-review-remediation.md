# Zen Draft Review Remediation

Status: completed
Owner: Codex
Last Reviewed: 2026-07-26

> Superseded decision (2026-07-26): the partial/empty degradation policy below
> no longer treats failed classifications as known absence. The current policy
> preserves healthy partial results, marks failed quiz assessments unknown,
> treats query-level failures as globally unavailable, and provides an explicit
> retry without a permanent loading state. See
> `docs/plans/2026-07-26-submission-draft-status-hardening.md` and
> `docs/ARCHITECTURE.md`.

## Objective

Implement the accepted Zen-draft review findings and adjacent session-lifecycle
issue without weakening user isolation, draft/result atomicity, excluded-mode
boundaries, or the classic service-worker architecture.

## Risk And Locked Decisions

- Tier 2: this change touches client persistence, session lifecycle, completion,
  and authenticated E2E coverage.
- A mounted session owns an immutable quiz seed. Metadata-only live-query record
  refreshes must not reset the session; a route/user/quiz identity change must.
- Genuine quiz changes remain guarded by draft hash/version validation and the
  atomic standard-Zen completion transaction. They do not hot-swap the active
  session seed.
- A pre-completion draft flush must succeed before result submission. Its retry
  repeats the full preflight with the original paused elapsed time.
- Draft status loading may degrade to partial/empty results, but failures must be
  logged and must never keep the dashboard in a permanent loading state.
- Draft status quiz lookup is limited to referenced IDs and accepts only the
  current user or `NIL_UUID` system ownership.
- Do not convert the classic service worker to a module or add a production-only
  test API. E2E discovers the active runtime cache through Cache Storage.
- No compatibility shims, alternate persistence path, schema change, or remote
  draft synchronization is permitted.

## Impacted Files And Boundaries

- `src/components/quiz/hooks/useZenDraftSession.ts`
- `src/components/quiz/hooks/useQuizSession.ts`
- `src/components/quiz/ZenQuizContainer.tsx`
- `src/hooks/useDatabase.ts`
- Focused unit tests for the hooks, container, dashboard, and card
- `tests/e2e/zen-draft.spec.ts` and a focused E2E helper
- `docs/ARCHITECTURE.md` only if implementation changes documented ownership

## Verification Gates

1. Focused unit tests for lifecycle stability, partial draft status results,
   public/system ownership, retryable completion, mappings, and eligibility.
2. Focused authenticated Zen-draft Playwright coverage when prerequisites exist.
3. `npm run verify`.
4. `npm run security-check`.
5. `npm run test:security-check`.
6. `npm run build`.
7. `npm run test:e2e` because the authenticated runtime flow changes and the
   repository's completed feature plan records a configured environment.
8. `git diff --check`, adversarial self-review, and staged secret scan.

## Rollback

Revert the remediation commit. No schema or stored-record migration is involved.
Rollback restores the prior lifecycle behavior and tests while leaving the v17
draft table and existing draft records untouched.

## Results

- Standard and draft-eligible Zen sessions now freeze their initialization seed
  for a quiz/user identity lifecycle, so metadata refreshes cannot reset active
  progress. Per-session runtime state isolates queued saves during identity
  transitions.
- Completion now requires a successful device-local draft flush and exposes a
  retryable failure state that preserves the original elapsed time.
- Dashboard draft compatibility queries are scoped to referenced, authorized
  quizzes and degrade to partial or empty loaded results on read/assessment
  failures.
- Review follow-ups cover mapping contracts, eligibility boundaries, cache
  discovery, both QuizCard branches, and concise empty-state test intent.
- Verification passed: focused unit tests (54), full `npm run verify` (897
  passed, 3 skipped), repository and harness security checks, production build,
  focused Zen-draft E2E (8 passed), and full E2E (120 passed, 2 skipped).
