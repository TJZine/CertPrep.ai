# E2E Testing Guide

> [!IMPORTANT]
> This guide is specific to Playwright E2E setup. For repo-wide workflow and verification policy, use `docs/ENGINEERING_RUNBOOK.md`.

> [!NOTE]
> Treat this file as an E2E-specific setup guide, not a general repo setup or deployment authority. `README.md`, `CONTRIBUTING.md`, and `docs/ENGINEERING_RUNBOOK.md` own the broader workflow and version baseline.

## Prerequisites

- Node.js 24+
- npm 9+
- Playwright browser binaries installed locally before the first E2E run:
  - `npx playwright install chromium`
- `.env.local` populated with the minimum E2E auth/bootstrap variables:
  - `NEXT_PUBLIC_SUPABASE_URL` for app startup and Supabase clients
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` for app startup and SSR/browser auth flows
  - `SUPABASE_SERVICE_ROLE_KEY` for `tests/e2e/global-setup.ts` user provisioning and magic-link generation

## Environment Configuration

### Development Mode (Recommended)

The canonical local entrypoint is `npm run test:e2e`. Playwright starts `npm run dev` automatically via `webServer` and injects `NEXT_PUBLIC_IS_E2E=true` for that test server.

```bash
# Preferred local flow
npm run test:e2e
```

If you want Playwright to reuse an already-running local dev server for debugging, start that server yourself with `NEXT_PUBLIC_IS_E2E=true` before invoking raw Playwright commands:

```bash
# Terminal 1
NEXT_PUBLIC_IS_E2E=true npm run dev

# Terminal 2
npx playwright test
```

### Production Mode

Tests can still run against `next start` builds using raw IndexedDB fallback, but this is less reliable. A warning will be logged. In restricted environments, local `npm run build` may be unavailable even though CI requires it.

```bash
npm run build
npm run start &
npm run test:e2e
```

## Security Notes

The database is only exposed to `window.__certprepDb` when **BOTH**:

1. `NODE_ENV !== 'production'`
2. `NEXT_PUBLIC_IS_E2E === 'true'`

This prevents accidental exposure in production deployments.

## Auth Token Management

Auth tokens are generated fresh in `global-setup.ts` via Supabase magic link flow. The tokens are stored in:

- `tests/e2e/.auth/user.json` - Browser storage state
- `tests/e2e/.auth/user-id.json` - Test user ID

These files are regenerated on each test run's global setup phase.

If `SUPABASE_SERVICE_ROLE_KEY` is missing, `global-setup.ts` will fail before any tests run. That is a real environment prerequisite, not an optional convenience.

## Running Tests

```bash
# All E2E tests
npm run test:e2e

# Specific spec files
npx playwright test tests/e2e/library.spec.ts

# With UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

Use raw `npx playwright ...` commands when you need spec-level targeting, UI mode, or debugging against an already-running server. Use `npm run test:e2e` for the standard repo verification path.

## CI Configuration

Ensure your CI pipeline:

1. Sets `NEXT_PUBLIC_IS_E2E=true` only for test builds (not production)
2. Has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in environment
3. Installs the required Playwright browser binaries before invoking the test command
4. Runs `globalSetup` to generate fresh auth tokens

Use the actual workflow and secret names present in your CI environment and repository settings. This file does not define CI authority.
