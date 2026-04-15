# Review Context

> [!WARNING]
> Reference-only reviewer context. This file may be stale and must not be treated as an authority surface.
>
> Authoritative sources:
>
> - [AGENTS.md](./AGENTS.md)
> - [docs/ENGINEERING_RUNBOOK.md](./docs/ENGINEERING_RUNBOOK.md)
> - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
> - Current implementation under `src/`
> - Active CI config under `.github/workflows/`

## Purpose

Use this file as a lightweight reminder of repo-specific review pressure points.
Do not use it to infer business, compliance, team, or operational claims that are not directly established elsewhere.

## Stable Review Heuristics

- Offline-first persistence is a real architectural constraint. Review changes to `src/db/*`, `src/lib/sync/*`, providers, and session flows carefully for ownership drift.
- `src/proxy.ts` is a boundary file. Route-protection, CSP, and auth redirect changes should be treated as high-risk.
- Supabase data writes for quiz, result, and SRS domains should remain concentrated in the sync layer rather than growing new ad hoc UI write paths.
- Schema truth lives in `supabase/migrations/*`, with `src/types/database.types.ts` as the derived application contract.
- Large hotspot files deserve extra scrutiny for scope creep, hidden policy, and duplicated logic.
- Stale docs should not be allowed to look authoritative. When reviewing doc changes, prefer one clear authority and obvious reference-only demotion for secondary docs.

## Current Hotspots To Review Carefully

- `src/components/analytics/TopicHeatmap.tsx`
- `src/lib/dataExport.ts`
- `src/stores/quizSessionStore.ts`
- `src/db/results.ts`
- `src/lib/sync/quizSyncManager.ts`
- `src/components/providers/SyncProvider.tsx`

## Review Questions

- Does this change create a second authority surface for workflow, architecture, or schema truth?
- Does this change move policy into UI code when a boundary owner already exists?
- Does this change weaken verification guidance or overstate certainty relative to repo evidence?
- Does this change increase coupling in a known hotspot without paying down any existing complexity?
