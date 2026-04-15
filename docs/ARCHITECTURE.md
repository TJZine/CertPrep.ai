# Architecture

This document describes present-day repo truth only.

When this file conflicts with code, config, generated types, or migrations, follow the code/config/migrations and update this file in the same pass.

## Scope

CertPrep.ai is a Next.js App Router application with an offline-first client data model.
The browser owns day-to-day quiz, result, and SRS interaction through Dexie-backed IndexedDB.
Supabase provides authentication, row-level-secured persistence, and cross-device synchronization for remote state.

## Runtime Composition Roots

The main runtime entrypoints are:

- [src/app/layout.tsx](../src/app/layout.tsx)
- [src/components/providers/AppProviders.tsx](../src/components/providers/AppProviders.tsx)
- [src/components/providers/AuthProvider.tsx](../src/components/providers/AuthProvider.tsx)
- [src/components/providers/SyncProvider.tsx](../src/components/providers/SyncProvider.tsx)
- [src/proxy.ts](../src/proxy.ts)

Route-handler surfaces currently in repo:

- [src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts)
- [src/app/api/auth/delete-account/route.ts](../src/app/api/auth/delete-account/route.ts)

Representative page entrypoints:

- [src/app/page.tsx](../src/app/page.tsx)
- [src/app/library/page.tsx](../src/app/library/page.tsx)
- [src/app/analytics/page.tsx](../src/app/analytics/page.tsx)
- [src/app/results/[id]/page.tsx](../src/app/results/[id]/page.tsx)
- [src/app/quiz/[id]/page.tsx](../src/app/quiz/[id]/page.tsx)
- [src/app/settings/page.tsx](../src/app/settings/page.tsx)

## Runtime Boundaries

### Routing, CSP, and Protected Routes

[src/proxy.ts](../src/proxy.ts) is the network boundary for:

- CSP nonce generation and header application
- request cache-control for document responses
- Supabase SSR cookie bridging
- protected-route and auth-route redirects

Changes to auth-route inventory, protected-route behavior, or CSP policy should be treated as boundary changes and documented here.

### Auth and Session Ownership

Auth/session responsibility is split across:

- server-side Supabase client creation in [src/lib/supabase/server.ts](../src/lib/supabase/server.ts)
- browser Supabase client creation in [src/lib/supabase/client.ts](../src/lib/supabase/client.ts)
- client auth lifecycle in [src/components/providers/AuthProvider.tsx](../src/components/providers/AuthProvider.tsx)
- auth callback exchange in [src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts)
- self-serve account deletion in [src/app/api/auth/delete-account/route.ts](../src/app/api/auth/delete-account/route.ts)

Quiz, result, and SRS data sync should not bypass the sync layer. Auth and profile/security flows already make direct Supabase calls where appropriate.

### Client Persistence Ownership

Primary client persistence lives in [src/db/dbInstance.ts](../src/db/dbInstance.ts), which defines the Dexie database and current tables:

- `quizzes`
- `results`
- `syncState`
- `srs`
- `hashCache`

The main local data access layer is:

- [src/db/quizzes.ts](../src/db/quizzes.ts)
- [src/db/results.ts](../src/db/results.ts)
- [src/db/srs.ts](../src/db/srs.ts)
- [src/db/syncState.ts](../src/db/syncState.ts)
- [src/hooks/useDatabase.ts](../src/hooks/useDatabase.ts)

### Sync Ownership

Remote synchronization ownership lives in:

- [src/lib/sync/quizSyncManager.ts](../src/lib/sync/quizSyncManager.ts)
- [src/lib/sync/syncManager.ts](../src/lib/sync/syncManager.ts)
- [src/lib/sync/srsSyncManager.ts](../src/lib/sync/srsSyncManager.ts)
- [src/lib/sync/quizRemote.ts](../src/lib/sync/quizRemote.ts)
- [src/lib/sync/quizDomain.ts](../src/lib/sync/quizDomain.ts)
- [src/components/providers/SyncProvider.tsx](../src/components/providers/SyncProvider.tsx)

The sync model is local-first. Local records are written first, then pushed/pulled against Supabase with user-scoped validation and conflict handling.

## Browser Storage Surfaces

In addition to IndexedDB, the app uses:

- `localStorage` for user/device preferences and lightweight cached state such as theme, comfort mode, dashboard/library sort state, streak state, and install-prompt dismissal
- `sessionStorage` for ephemeral session flow state such as topic study, SRS review, flashcards, smart rounds, and interleaved practice
- service worker registration and cache-clearing hooks via [public/sw.js](../public/sw.js), [src/components/common/ServiceWorkerInitScript.tsx](../src/components/common/ServiceWorkerInitScript.tsx), and [src/lib/serviceWorkerClient.ts](../src/lib/serviceWorkerClient.ts)

## E2E / Test Harness Boundaries

Playwright and the E2E bootstrap path are test-only surfaces, but they intersect real runtime boundaries:

- [playwright.config.ts](../playwright.config.ts) owns the main Playwright project config, browser launch flags for test projects, and the `NEXT_PUBLIC_IS_E2E` test-build toggle passed to the local web server
- [tests/e2e/global-setup.ts](../tests/e2e/global-setup.ts) provisions the test user, bootstraps auth state through Supabase admin APIs and magic-link flow, and launches its own Chromium instance for auth-state setup
- [src/db/dbInstance.ts](../src/db/dbInstance.ts) conditionally exposes `window.__certprepDb` only when `NODE_ENV !== "production"` and `NEXT_PUBLIC_IS_E2E === "true"`
- [tests/e2e/helpers/db.ts](../tests/e2e/helpers/db.ts) depends on that guarded DB exposure for reliable test helpers
- [tests/e2e/README.md](../tests/e2e/README.md) is the setup guide for current E2E prerequisites and command entrypoints

Changes to browser launch flags, auth bootstrap, or the E2E DB exposure gate should be treated as test-boundary changes. If the investigation also changes CSP, proxy, auth-route, or other production runtime behavior, reroute the work as a production boundary change and update the corresponding sections in this document.

## Supabase Database Schema

Repo-visible schema surfaces currently split into:

- `src/lib/supabase/schema.sql` for baseline table, trigger, and RLS definitions still present in the repo
- `supabase/migrations/*` for repo-root incremental changes
- `src/lib/supabase/migrations/*` as legacy/reference-only companion migrations that are no longer treated as active authority
- [src/types/database.types.ts](../src/types/database.types.ts) as the derived application contract from a generated database state

Human-readable schema notes in this document are summaries only. If schema surfaces disagree, do not assume the repo has a single clean bootstrap path today.

### `quizzes`

The remote `quizzes` table stores user-owned quiz definitions and sync metadata.
Local quiz ownership and soft-delete behavior are implemented in the Dexie layer and synchronized through the quiz sync managers.

Relevant code:

- [src/db/quizzes.ts](../src/db/quizzes.ts)
- [src/lib/sync/quizSyncManager.ts](../src/lib/sync/quizSyncManager.ts)
- [src/lib/sync/quizRemote.ts](../src/lib/sync/quizRemote.ts)

### `results`

The remote `results` table stores quiz attempt history, including analytics-oriented metadata such as `session_type` and `source_map`.
Soft-delete and resurrection protection are part of the current remote model.

Relevant migration examples:

- [supabase/migrations/20251214073000_results_lww_protection.sql](../supabase/migrations/20251214073000_results_lww_protection.sql)
- [supabase/migrations/20251221080000_add_session_metadata.sql](../supabase/migrations/20251221080000_add_session_metadata.sql)

Relevant code:

- [src/db/results.ts](../src/db/results.ts)
- [src/lib/sync/syncManager.ts](../src/lib/sync/syncManager.ts)

### `srs`

The remote `srs` table stores spaced-repetition review state keyed by `question_id` and `user_id`.
Current active repo-visible surfaces use string/text `question_id` values and a JSONB batch RPC shape. Older companion migrations under `src/lib/supabase/migrations/*` still show an earlier UUID-based batch-upsert path and remain reference-only unless a maintainer explicitly revives them.

Relevant migration:

- [supabase/migrations/20251214074500_srs_lww_batch_upsert.sql](../supabase/migrations/20251214074500_srs_lww_batch_upsert.sql)

Relevant code:

- [src/db/srs.ts](../src/db/srs.ts)
- [src/lib/sync/srsSyncManager.ts](../src/lib/sync/srsSyncManager.ts)

## External Integrations

Current external/system boundaries visible in repo:

- Supabase for auth, remote persistence, and row-level security
- hCaptcha for signup / password-reset protection paths
- Sentry for client, server, and edge telemetry
- Vercel-oriented instrumentation signals via Speed Insights and `VERCEL_ENV` handling in config

Relevant files:

- [src/components/auth/SignupForm.tsx](../src/components/auth/SignupForm.tsx)
- [src/components/auth/ForgotPasswordForm.tsx](../src/components/auth/ForgotPasswordForm.tsx)
- [sentry.client.config.ts](../sentry.client.config.ts)
- [sentry.server.config.ts](../sentry.server.config.ts)
- [sentry.edge.config.ts](../sentry.edge.config.ts)
- [next.config.js](../next.config.js)

## Verification Surfaces

Verification authority lives in [docs/ENGINEERING_RUNBOOK.md](./ENGINEERING_RUNBOOK.md), [package.json](../package.json), and [.github/workflows/ci.yml](../.github/workflows/ci.yml). `scripts/verify-build.sh` is a convenience wrapper, not the primary verification authority.

For Playwright-specific setup and troubleshooting, use [tests/e2e/README.md](../tests/e2e/README.md) and [docs/E2E_DEBUGGING_REFERENCE.md](./E2E_DEBUGGING_REFERENCE.md) as supporting context under the runbook's verification policy.

## Hotspots

Large or high-coupling files currently worth treating carefully:

- [src/components/analytics/TopicHeatmap.tsx](../src/components/analytics/TopicHeatmap.tsx)
- [src/lib/dataExport.ts](../src/lib/dataExport.ts)
- [src/stores/quizSessionStore.ts](../src/stores/quizSessionStore.ts)
- [src/components/dashboard/ImportModal.tsx](../src/components/dashboard/ImportModal.tsx)
- [src/db/results.ts](../src/db/results.ts)
- [src/components/results/ResultsContainer.tsx](../src/components/results/ResultsContainer.tsx)
- [src/components/settings/DataManagement.tsx](../src/components/settings/DataManagement.tsx)
- [src/lib/sync/quizSyncManager.ts](../src/lib/sync/quizSyncManager.ts)
- [src/components/providers/SyncProvider.tsx](../src/components/providers/SyncProvider.tsx)

One repo-specific hotspot is aggregated-session persistence. [src/components/quiz/hooks/useQuizPersistence.ts](../src/components/quiz/hooks/useQuizPersistence.ts) builds `sourceMap` data by scanning quizzes, so changes around aggregated sessions should be reviewed with scale in mind.

## Working Rules

- Treat `AGENTS.md` as the entrypoint map, `docs/ENGINEERING_RUNBOOK.md` as workflow authority, and this file as current-state architecture truth.
- Treat the current DB contract as a split surface: `src/lib/supabase/schema.sql` for baseline schema/RLS still in repo, `supabase/migrations/*` for repo-root deltas, and generated types as derived output. Treat `src/lib/supabase/migrations/*` as legacy/reference-only unless a maintainer explicitly says otherwise.
- Do not add direct Supabase data writes from UI for quiz, result, or SRS domains; those domains already have dedicated sync ownership in `src/lib/sync/*`.
- Do not add new route protection or CSP behavior outside `src/proxy.ts` without documenting the boundary change.
- Do not add new environment-variable ownership points casually. Current env reads are spread across bootstrap/config (`next.config.js`, `src/proxy.ts`, `src/lib/supabase/*`), route handlers, auth UI, instrumentation, and feature-flag/constants modules.
- Update this file in the same pass when changing composition roots, route handlers, persistence boundaries, sync invariants, verification ownership, or external integrations.

## Known Gaps and Explicit Unknowns

- Deployment and release behavior beyond repo-visible evidence is intentionally undocumented here.
- The repo does not yet expose one clean, consolidated database bootstrap surface; schema/RLS/bootstrap work should be treated as a stop-and-ask area until the split surfaces are consolidated.
- This file does not attempt to preserve historical ADRs as a separate authority surface.
- If a future migration, generated-type refresh, or runtime change disagrees with this document, the code/migrations win and this document should be updated immediately.
