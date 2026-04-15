# Analytics E2E Testing & Accessibility Guide

> [!WARNING]
> Reference-only document. Parts of this guide are stale and must not override the current `tests/e2e/*` implementation.
>
> For current repo-wide verification policy, use [docs/ENGINEERING_RUNBOOK.md](./ENGINEERING_RUNBOOK.md).
> For current E2E setup, use [tests/e2e/README.md](../tests/e2e/README.md) and the committed `tests/e2e/*.spec.ts` / `tests/e2e/fixtures/*` files.

This file is historical context from an earlier analytics E2E/accessibility push.

Current repo-visible truth:

- `tests/e2e/analytics.spec.ts` covers analytics empty-state and seeded-data behavior.
- `tests/e2e/fixtures/analyticsData.ts` provides the committed analytics seeding helper.
- The repo does **not** currently ship `axe-playwright`, and the committed analytics Playwright suite does **not** include accessibility assertions.

If analytics accessibility coverage is revived, start from the current `tests/e2e/*` suite and document the new implementation in a fresh, authoritative guide instead of reusing this file as instructions.
