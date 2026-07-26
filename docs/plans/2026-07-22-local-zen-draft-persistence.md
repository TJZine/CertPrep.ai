# Device-Local Zen Draft Persistence

Status: completed
Owner: Codex
Last Reviewed: 2026-07-22

## Objective

Implement Phase 1 device-local resumable drafts for standard Zen Study, including
the persistence contract, safe lifecycle integration, dashboard affordances,
focused automated coverage, Tier 2 verification, adversarial review, and a
single conventional commit.

## Locked Decisions

- Drafts are device-local IndexedDB records in a dedicated Dexie table and never
  enter Supabase, sync plans, or sync metadata.
- Phase 1 supports only ordinary Zen Study. Proctor, Flashcards, Smart Round,
  Topic Study, SRS Review, Interleaved Practice, and remixed Zen always use the
  existing fresh-session behavior.
- One draft is owned by one user and quiz. Hydration requires both identities,
  the supported mode and schema version, a matching quiz content hash, and a
  still-available quiz.
- Resume and Start Over are explicit accessible choices. Unsafe, invalid, or
  stale drafts are not silently hydrated or silently deleted.
- Results stay append-only. Result persistence must complete before draft
  deletion; a result-save failure leaves the draft recoverable.
- Cross-device result reconciliation compares completed-result time with the
  draft's start time. A conflict requires Start New Attempt or Resume as New
  Attempt before any hydration.
- Concurrent tabs use stored revision/update ownership and conditional writes so
  an older session cannot silently overwrite newer progress.
- Autosave occurs at meaningful transitions and bounded timer checkpoints, not
  every second. Stored values are validated serializable primitives and arrays;
  no correct-answer plaintext or unnecessary quiz content is stored.
- Existing sign-out ownership is preserved unless executable behavior is
  ambiguous, in which case implementation stops for maintainer direction.
- No compatibility shims, dual persistence paths, Supabase migrations, remote
  fallback, or synchronization plumbing are permitted.

## Impacted Boundaries

- Dexie schema/versioning and a typed local-only draft access layer
- Standard Zen Zustand/session initialization, transitions, exit, and completion
- Dashboard launch labels and routing for valid local drafts
- Quiz deletion, factory reset, and established sign-out/account-switch cleanup
- Unit/integration tests and authenticated Playwright resume coverage
- `docs/ARCHITECTURE.md` client persistence and sync ownership documentation

Exact file ownership will be finalized after deterministic repository discovery
and specialist reports. The primary agent owns all edits.

## Discovery Record

- Codanna was attempted first on 2026-07-22. The index reported 17,646 symbols,
  but semantic searches for the Zen lifecycle and Dexie persistence returned no
  matches, and exact symbol searches for `QuizSession` and `dbInstance` also
  returned no matches. Deterministic `rg` and direct file reads are therefore the
  recorded fallback for relevant executable surfaces.
- Context7 resolved `/dexie/dexie.js` and `/pmndrs/zustand/v5.0.12`. Current
  guidance confirms additive typed Dexie schema declarations and multi-table
  atomic transactions, plus Zustand `getState`, `setState`, `subscribe`, and
  selective serializable persistence patterns. Repository executable truth will
  determine the concrete integration.

## Execution Plan

1. Inspect repository state and collect bounded read-only persistence,
   session-lifecycle, and verification specialist findings.
2. Specify the draft record, validation/hash rules, conditional-write protocol,
   transaction ordering, cleanup, and reconciliation classifications.
3. Implement the local draft layer and standard-Zen-only lifecycle/UI/dashboard
   integration while keeping all excluded modes on their current paths.
4. Add focused unit/integration/E2E coverage and update architecture truth.
5. Run required Tier 2 verification, then obtain and resolve an adversarial
   read-only review of the complete diff.
6. Stage only feature files, run the staged secret scan, and create
   `feat(quiz): persist local zen drafts`.

## Verification Gates

- Focused unit/integration tests for schema migration, CRUD, serialization and
  validation, optimistic concurrency, lifecycle hydration/autosave/completion,
  failure retention, cleanup, isolation, exclusions, labels, and copy
- Focused authenticated Playwright tests for reload, dashboard navigation,
  offline resume, explicit restart, and stable dashboard geometry
- `npm run verify`
- `npm run security-check`
- `npm run test:security-check`
- `npm run build`
- `npm run test:e2e` when the documented environment prerequisites are present
- `npm run test:e2e:production` only if production service-worker, offline-shell,
  CSP, CORS, or browser-security behavior changes
- `git diff --check`, complete scope review, staged-only secret scan

## Rollback

Revert the feature commit. Dexie's additive database version cannot be removed
from already-upgraded browsers, so rollback code must tolerate the now-unused
local table without adding a compatibility read path or syncing its contents.
No remote schema or remote data rollback is involved.

## Results

Implemented a Dexie v17 `zenDrafts` table keyed by user and quiz, strict
standard-Zen eligibility, explicit resume/restart/reconciliation choices,
revision-and-writer compare-and-set saves, atomic result creation plus draft
deletion, dashboard continuation labels, local cleanup, and architecture truth.
The table is absent from every sync manager and has no sync metadata.

Observed verification on 2026-07-22:

- `npm run verify`: 145 files passed, 1 skipped; 888 tests passed, 3 skipped
- focused persistence/session tests: 22 passed after adversarial fixes
- focused authenticated Playwright: 4 passed with no retries
- `npm run test:e2e`: 120 passed, 2 skipped across configured projects
- `npm run security-check`, `npm run test:security-check`, and
  `npm run build`: passed
- `git diff --check`: passed

The final adversarial review found and verified fixes for an unmount snapshot
race, unreachable result-save recovery controls, and stale-tab exit deadlock.
No remaining P0/P1 finding was reported. Production service-worker E2E was not
required because no service-worker, offline-shell, CSP, CORS, or browser
security implementation changed. The known reconciliation limitation is that
cross-device result timestamps inherit client clock skew. The conventional
feature commit is this plan's delivery commit; its hash is recorded in the
handoff because a commit cannot contain its own final hash.
