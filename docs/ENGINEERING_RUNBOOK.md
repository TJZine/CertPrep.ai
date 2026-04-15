# Engineering Runbook

## Purpose

This document is the single workflow authority for engineering work in this repository.

It defines precedence, task routing, risk tiers, planning expectations, verification policy, review policy, freshness triggers, durable-memory rules, and deprecation rules.

## Precedence

Executable truth wins when documentation drifts:

1. Code, config, migrations, `package.json` scripts, and CI workflows

Among repository documents, apply this order for workflow and verification policy:

1. `docs/ENGINEERING_RUNBOOK.md` (this file)
2. `AGENTS.md`
3. `README.md`, `CONTRIBUTING.md`, and other reference docs

For current-state architecture and boundary descriptions, use this order:

1. `docs/ARCHITECTURE.md`
2. `README.md`, `CONTRIBUTING.md`, and other reference docs

If any document conflicts with executable truth, update or demote the document in the same change.

## Task Routing

- Docs-only/control-plane changes: edit policy/architecture docs and run docs-control verification.
- Logic-only TypeScript changes (no UI/runtime boundary impact): run logic verification.
- UI/navigation/runtime-boundary changes (routing, providers, auth/session, sync, storage, proxy, API routes): run full verification.
- Security-sensitive or auth/storage contract changes: run full verification and require explicit review before merge.

## Risk Tiers

- Tier 0 (Low): wording/docs updates with no behavior changes.
- Tier 1 (Moderate): internal refactors with stable interfaces and no boundary changes.
- Tier 2 (High): changes touching routing, auth/session, sync, persistence schema/contracts, proxy behavior, or public API boundaries.
- Tier 3 (Critical): changes that alter security boundaries, destructive data behavior, or rollout/production safety.

Plan and verification depth must increase with tier.

## Planning Expectations

- Keep the active, authoritative plan in Codex `update_plan`.
- Use durable plan files in `docs/plans/*` only when work spans sessions, requires handoff, or carries Tier 2+ risk.
- For multi-step work, include:
  - locked decisions
  - impacted files/boundaries
  - verification commands
  - rollback notes for risky changes
- Do not commit until required review is complete when a task explicitly requests pre-commit adversarial review.

## Verification Policy

### Command Status

- `npm run lint`: exists in `package.json`; local runnable.
- `npm run typecheck`: exists in `package.json`; local runnable.
- `npm test`: exists in `package.json`; local runnable.
- `npm run verify`: exists in `package.json`; local runnable.
- `npm run build`: exists in `package.json`; required in CI (`.github/workflows/ci.yml`).
- `npm run security-check`: exists in `package.json`; local runnable.
- `npm run test:e2e`: exists in `package.json`; requires local environment/secrets.

### Required Verification Sets

- Fast local sanity:
  - `npm run lint`
  - `npm run typecheck`

- Logic-only:
  - `npm run typecheck`
  - `npm test`

- Docs/control-plane:
  - Validate links/paths/commands you changed by direct file checks
  - If policy text references scripts/workflows, verify those entries still exist in `package.json` and `.github/workflows/*`

- Full verification (Tier 2+):
  - `npm run verify`
  - `npm run security-check`
  - `npm run build` when environment allows

### Build Environment Caveat

`npm run build` is a required CI check. In restricted local environments, build may be unavailable (for example, sandbox port-binding restrictions). Treat this as an environment limitation, not an automatic repository failure. Record that limitation explicitly in handoff/adoption notes when it occurs.

### E2E Caveat

`npm run test:e2e` depends on environment setup and secrets (including Supabase-related credentials). Treat E2E as required only when the changed surface warrants it and the environment is properly configured.

## Review Policy

- Every change must include a self-review pass for:
  - scope correctness
  - authority conflicts
  - verification coverage
  - stale references introduced by the change
- For Tier 2+ changes, perform explicit adversarial review before commit when requested by task policy.
- Findings from review must be fixed or explicitly documented as unresolved with owner follow-up before merge.

## Freshness Triggers

Update docs in the same pass when changes touch:

- startup/composition surfaces (`src/app/*`, providers, proxy, route handlers)
- auth/session flows
- sync/persistence contracts (Dexie/Supabase schema and sync paths)
- verification scripts or CI gates
- authority/preference rules in this runbook or `AGENTS.md`

If architecture or workflow changed and docs were not updated, the PR is incomplete.

## Durable-Memory Rules

- `update_plan` is the live execution memory.
- `docs/plans/*` stores durable plans and handoff artifacts for multi-session or high-risk work.
- One active plan per initiative. Mark completed plans clearly and avoid duplicate active authority for the same initiative.

## Deprecation Rules

- Do not leave stale docs appearing authoritative.
- For superseded docs:
  - archive when low value, or
  - keep with a clear "reference-only / may be stale" banner and pointer to current authorities.
- Remove duplicated policy text from secondary docs; replace with concise pointers to `AGENTS.md`, this runbook, and architecture truth.

## Deployment and Release Facts

Only verified facts are documented here:

- CI runs on pushes to `main` and pull requests (`.github/workflows/ci.yml`).
- CI jobs include lint/typecheck, tests, and build.
- `main` is automatically synchronized to `staging` via `.github/workflows/sync-staging.yml`.

Any additional deployment behavior is currently unknown and must be confirmed before documentation as policy.
