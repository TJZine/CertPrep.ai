# Pre-Browser-Audit Production Remediation

Status: completed
Owner: Codex
Last Reviewed: 2026-07-19

## Scope

This plan covers the accepted findings from the 2026-07-18 mechanical
production review that should be resolved or validated before the full visual
and functional browser audit.

Accepted findings:

- F1: Legacy aggregated results are classified by the hook but rejected by the
  read-model resolver.
- F2: `clearAllData` leaves the `srs` and `hashCache` IndexedDB tables intact.
- F3: Account deletion signs out before remote deletion and clears local data
  even when remote deletion fails.
- F4: Aggregated-session save failures clear recoverable session state and
  redirect without a retry path.
- F5: The service worker overwrites the application-shell cache key with every
  successful navigation and has conflicting automatic/manual update behavior.
- F6: The default Playwright harness blocks service workers and disables browser
  security, so it cannot provide a production-like browser signal.
- F7: The general `security-check` command only scans staged files.

Parked findings:

- Large-module extraction and other maintainability refactors. These are not
  prerequisites for the browser audit and would unnecessarily enlarge the
  behavioral regression surface.

## Locked Decisions

- Preserve the current local-first architecture and existing persistence
  schema; no migration or compatibility shim is introduced.
- Treat legacy aggregated results as aggregated only when the caller has
  established the legacy SRS invariant.
- Clear all five Dexie tables atomically for every factory-reset/local-clear
  path.
- Preserve local data and the current browser session when remote account
  deletion fails.
- Preserve aggregated-session state after save failure and expose the existing
  retry contract to those session types.
- Reproduce the service-worker concern in a normal browser before changing its
  caching or lifecycle policy.
- Choose one service-worker registration owner and one update policy rather
  than retaining competing paths.
- Keep the current mock-friendly E2E projects where needed, but add a distinct
  production-like project/entrypoint with normal browser security and enabled
  service workers.
- Split staged secret scanning from repository-wide secret scanning without
  weakening the pre-commit hook.

## Package Overview

| Package                   | Findings | Risk reduced                                                                  | Verification gate                                   |
| ------------------------- | -------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| P1: Data integrity        | F1, F2   | Incorrect historical results and incomplete privacy reset                     | Focused resolver and database-reset tests           |
| P2: Destructive auth flow | F3       | Local data loss and session invalidation after failed deletion                | Route and settings failure-path tests               |
| P3: Save recovery         | F4       | Loss of completed aggregated sessions                                         | Hook failure/retry tests for all session types      |
| P4: PWA lifecycle         | F5       | Incorrect offline documents, unreliable cache writes, contradictory updates   | Normal-browser reproduction plus focused SW tests   |
| P5: Verification surfaces | F6, F7   | False confidence from non-production browser settings and no-op security scan | Playwright config listing and scanner fixture tests |

## Package Details

### P1: Data Integrity

Primary files:

- `src/db/aggregatedQuiz.ts`
- `src/hooks/useDatabase.ts`
- `src/lib/dataExport.ts`
- `src/db/dbInstance.ts`
- `tests/unit/aggregatedQuiz.test.ts`
- focused reset tests

Approach:

- Make legacy aggregated classification explicit at the resolver boundary.
- Remove the unsafe undefined-to-`Quiz` cast from reachable aggregated paths.
- Route all complete local resets through one atomic five-table operation.

Rollback:

- Revert P1 as a unit. It has no schema or remote-data migration.

### P2: Destructive Auth Flow

Primary files:

- `src/app/api/auth/delete-account/route.ts`
- `src/components/settings/DataManagement.tsx`
- `tests/unit/deleteAccountRoute.test.ts`
- focused `DataManagement` tests

Approach:

- Perform remote deletion before session cleanup.
- Do not clear local state or redirect on non-success responses or network
  failure.
- Keep cookie cleanup after confirmed deletion.

Rollback:

- Revert the route and UI flow together to avoid mismatched client/server
  semantics.

### P3: Save Recovery

Primary files:

- `src/components/quiz/hooks/useQuizPersistence.ts`
- `tests/unit/components/quiz/hooks/useQuizPersistence.test.tsx`
- consuming quiz container only if required by the existing retry contract

Approach:

- Track aggregated-session save failure in the hook.
- Preserve storage and remain on the current completion state after failure.
- Retry the same aggregated persistence operation through `retrySave`.
- Clear storage and navigate only after a confirmed write.

Rollback:

- Revert the hook and focused tests together. No stored-data format changes.

### P4: PWA Lifecycle

Primary files:

- `public/sw.js`
- `src/components/common/ServiceWorkerInitScript.tsx`
- `src/components/providers/AppProviders.tsx`
- `src/hooks/useServiceWorker.ts`
- service-worker tests

Approach:

- First capture the current cache behavior in a normal browser.
- Keep an immutable installation-time shell fallback instead of overwriting `/`
  with arbitrary route documents.
- Await cache writes inside the service-worker event lifetime.
- Select either immediate automatic activation or a waiting-worker banner,
  then align registration and reload behavior with that choice.
- Retain one registration owner.

Rollback:

- Bump the cache version when shipping changed cache semantics.
- Reverting requires restoring the previous worker and another cache-version
  bump so clients do not retain incompatible cache contents.

### P5: Verification Surfaces

Primary files:

- `playwright.config.ts` or a dedicated production-like Playwright config
- `package.json`
- `.github/workflows/ci.yml` only if environment prerequisites are established
- `scripts/check-secrets.sh`
- a repository-scan wrapper or mode
- `docs/ENGINEERING_RUNBOOK.md`
- `tests/e2e/README.md`

Approach:

- Add a production-like browser entrypoint with service workers enabled and no
  browser-security bypass flags.
- Do not claim CI coverage unless the required Supabase secrets and browser
  installation are repo-visible and configured.
- Preserve staged scanning for pre-commit and add an explicit tracked-files
  repository scan for full verification.
- Update workflow documentation to name the correct commands and limitations.

Rollback:

- Verification changes can be reverted independently from product behavior,
  except corresponding workflow documentation must remain synchronized.

## Sequencing and Gates

1. Baseline: confirm clean tracked worktree, current focused tests, full unit
   suite, build, and browser prerequisites.
2. Reproduce F5 without changing service-worker code.
3. Implement P1 and run focused tests.
4. Implement P2 and run focused route/UI tests.
5. Implement P3 and run focused hook/container tests.
6. Implement P4 using the reproduced behavior as the acceptance criterion.
7. Implement P5 and validate both browser modes and both secret-scan modes.
8. Run `npm run verify`, the repository-wide security scan, `npm run build`,
   and required E2E checks when environment prerequisites are available.
9. Perform a final diff review for scope, authority drift, failure semantics,
   and rollback safety.

The plan is invalidated if implementation requires a persistence-schema change,
deployed Supabase assumptions not established in the repository, or an
unavailable required E2E environment. In those cases, stop and request
maintainer direction.

## Non-Goals

- Broad module decomposition.
- UI redesign or visual polishing.
- Database bootstrap consolidation.
- Production deployment.
- Destructive testing against a non-disposable account.

## Outcome

All accepted pre-browser-audit findings were remediated:

- Legacy aggregated results now use an explicit, validated legacy read path.
- Complete local resets clear every Dexie table.
- Remote account deletion completes before local session/data cleanup, and
  failures preserve recoverable local state.
- Aggregated quiz save failures retain session state and support retry.
- Service-worker registration and update ownership are unified; navigation
  caching is route-correct and falls back to a dedicated offline document.
- A normal-security, service-worker-enabled Playwright entrypoint now guards
  offline navigation behavior in CI.
- Repository-wide and staged secret scans are separate, explicit commands.
- The nonce-bearing theme bootstrap uses a native pre-paint script and
  suppresses the browser's nonce-hiding hydration mismatch.

The parked large-module and maintainability work remains outside this package;
it is not a prerequisite for the browser audit.

## Verification Results

Completed on 2026-07-19:

- `npm run verify`: 126 test files passed, 1 skipped; 787 tests passed, 3
  skipped.
- `npm run test:e2e`: 112 tests passed, 2 skipped.
- `npm run test:e2e:production`: 1 test passed with the same placeholder
  Supabase environment used by CI and no browser hydration warning.
- `npm run security-check`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.
