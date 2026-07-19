# Review Suggestion Remediation Plan

Status: completed
Owner: Codex
Last Reviewed: 2026-07-19

## Objective

Implement the accepted review suggestions and validated adjacent concerns without
adding compatibility paths or weakening existing destructive-flow guarantees.

## Risk

Tier 3. The work changes a destructive account-deletion boundary and the
production-like E2E/CI execution path.

## Locked Decisions

- Disable checkout credential persistence in every read-only `ci.yml` job, but
  retain credentials in the staging synchronization workflow that pushes.
- Keep Sentry on its current supported option shape and remove the verified
  no-op Vercel monitor setting instead of moving it to a deprecated location.
- Build before launching `next start` for production PWA tests and never reuse
  an arbitrary process already listening on the test URL.
- Give account deletion a server-owned upstream deadline that is shorter than
  the browser deadline, preserve local data on every unconfirmed outcome, and
  describe timeout outcomes as unconfirmed rather than definitively failed.
- Hide all decorative particle trees with a real DOM ancestor because the
  installed tsParticles React adapter does not forward arbitrary ARIA props.

## Impacted Boundaries

- `.github/workflows/ci.yml`
- `next.config.js`
- `playwright.production.config.ts`
- `src/app/api/auth/delete-account/route.ts`
- `src/components/settings/DataManagement.tsx`
- `src/components/effects/*Particles.tsx`
- `docs/ARCHITECTURE.md`
- `tests/e2e/README.md`
- Focused unit tests for each behavior

## Verification

1. Focused Vitest coverage for Playwright configuration, account deletion, and
   particle accessibility.
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run security-check`
6. `npm run build`
7. `npm run test:e2e:production`

Steps 2–4 were executed through `npm run verify`, which runs `npm run lint`,
`npm run typecheck`, and `npm test` in that order.

If E2E prerequisites or the build environment are unavailable, record the exact
gap and stop before claiming Tier 3 verification is complete.

## Rollback

- Keep CI/test-harness changes separate from runtime/accessibility changes where
  commit boundaries allow.
- Revert account-deletion client and route deadline changes together so their
  timeout ordering and user messaging cannot drift.
- Revert particle wrappers and their focused tests together.

## Outcome

- Focused Playwright, account-deletion, and particle tests passed.
- `npm run verify` passed: 127 test files passed, 1 skipped; 793 tests passed,
  3 skipped.
- `npm run security-check` passed.
- `npm run build` passed with verification-safe Supabase placeholders and Sentry
  upload disabled.
- `npm run test:e2e:production` passed against a freshly built `next start`
  server: 1 test passed.

## Follow-up Outcome

- Clarified that `npm run verify` is the execution record for lint, typecheck,
  and unit tests.
- Focused Playwright configuration, account-deletion, and particle-accessibility
  coverage passed: 19 tests passed.
- `npm run verify` passed: 140 test files passed, 1 skipped; 838 tests passed,
  3 skipped.
- `npm run security-check` passed.
- `npm run build` passed with verification-safe Supabase placeholders and Sentry
  upload disabled.
