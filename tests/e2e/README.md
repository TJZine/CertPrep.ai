# E2E Testing Guide

## Prerequisites

- Node.js 18+
- npm 9+
- Running dev server (`npm run dev`) or production build

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

Tests can still run against `next start` builds using raw IndexedDB fallback, but this is less reliable. A warning will be logged.

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

```yaml
# Example GitHub Actions
env:
  NEXT_PUBLIC_IS_E2E: "true"
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```
