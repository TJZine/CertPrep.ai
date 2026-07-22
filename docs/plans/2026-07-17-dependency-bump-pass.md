# Dependency Bump Pass

Status: completed
Owner: Codex
Last Reviewed: 2026-07-17

## Scope

Refresh the repository's npm dependencies to current compatible releases, remove
known vulnerable versions where the dependency graph permits it, and make only
the code/config changes required by those upgrades.

## Locked Decisions

- Keep Next.js and React on their current major versions.
- Upgrade `@supabase/ssr` to the current `0.12.x` line and migrate the shared
  server client to the supported `getAll`/`setAll` cookie adapter.
- Keep ESLint on the latest v9 release because plugins in the current Next.js
  preset do not yet declare ESLint 10 compatibility.
- Upgrade tsParticles, lint-staged, and Puppeteer to their current majors.
- Migrate each lazily loaded tsParticles effect to the v4 provider contract
  without blocking the rest of the application while the engine initializes.
- Keep Tailwind CSS on v3; v4 requires a dedicated CSS/PostCSS/config migration.
- Keep TypeScript on v5 and `@types/node` on the Node 24 line; TypeScript 7 and
  Node 26 types are not aligned with the current runtime/toolchain.
- Do not add compatibility or dual-path fallbacks.

## Impacted Surfaces

- `package.json`
- `package-lock.json`
- `src/lib/supabase/server.ts`
- `src/components/effects/*Particles.tsx`
- Dependency-derived lint, test, build, and browser-tooling behavior

## Verification

- `npm install`
- `npm run verify`
- `npm run security-check`
- `npm run build`
- `npm audit`
- Targeted inspection of `npm outdated` and the final dependency tree

E2E is not required unless the dependency updates force behavioral changes to
the Playwright bootstrap/config or reveal an auth/session regression that is
only covered by E2E.

## Rollback

Revert the package manifest and lockfile together. If the Supabase SSR update is
rolled back independently, also revert the shared server cookie adapter so the
code and installed contract remain aligned.

## Outcome

- Updated all compatible direct dependencies and regenerated the lockfile with
  `npm ci` reproducibility confirmed.
- Migrated Supabase SSR cookies and tsParticles v4 initialization.
- Kept `@types/node` 24, ESLint 9, Tailwind CSS 3, and TypeScript 5 intentionally
  because their latest majors are not aligned with the current runtime/presets
  or require dedicated migrations.
- Reduced `npm audit` from 29 findings (6 high, 22 moderate, 1 low) to 17
  moderate findings. The remainder are confined to Lighthouse's pinned
  Sentry/OpenTelemetry toolchain; npm proposes downgrading Lighthouse to
  `12.6.1`, so no unsafe forced fix was applied.

## Verification Results

- `npm ci`: passed
- `npm run verify`: passed (124 test files passed, 1 skipped; 778 tests passed,
  3 skipped)
- `npm run security-check`: passed
- `npm run build`: passed
- `npx playwright test --list`: passed (114 tests discovered)
- Puppeteer/Lighthouse import and script syntax probes: passed
- `git diff --check`: passed
