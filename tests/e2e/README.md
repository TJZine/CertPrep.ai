# E2E Testing Guide

> [!IMPORTANT]
> This guide is specific to Playwright E2E setup. For repo-wide workflow and verification policy, use `docs/ENGINEERING_RUNBOOK.md`.

> [!NOTE]
> Treat this file as an E2E-specific setup guide, not a general repo setup or deployment authority. `README.md`, `CONTRIBUTING.md`, and `docs/ENGINEERING_RUNBOOK.md` own the broader workflow and version baseline.

## Prerequisites

- Node.js 24+
- npm 9+
- Running dev server (`npm run dev`) or a local production build/start flow when the environment allows it

## Environment Configuration

### Development Mode (Recommended)

Set `NEXT_PUBLIC_IS_E2E=true` to enable reliable database access:

```bash
# In .env.local or shell
NEXT_PUBLIC_IS_E2E=true npm run dev

# Run tests
npx playwright test
```

### Production Mode

Tests can still run against `next start` builds using raw IndexedDB fallback, but this is less reliable. A warning will be logged. In restricted environments, local `npm run build` may be unavailable even though CI requires it.

```bash
npm run build
npm run start &
npx playwright test
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

## Running Tests

```bash
# All E2E tests
npx playwright test

# Specific spec files
npx playwright test tests/e2e/library.spec.ts

# With UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

## CI Configuration

Ensure your CI pipeline:

1. Sets `NEXT_PUBLIC_IS_E2E=true` only for test builds (not production)
2. Has valid Supabase credentials in environment
3. Runs `globalSetup` to generate fresh auth tokens

Use the actual workflow and secret names present in your CI environment and repository settings. This file does not define CI authority.
