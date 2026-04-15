# AGENTS.md

This is the canonical, short entrypoint for repository workflow policy.

## Read Order

1. `AGENTS.md` (this file): always-on defaults and policy map
2. `docs/ENGINEERING_RUNBOOK.md`: single workflow authority
3. `docs/ARCHITECTURE.md`: current-state architecture truth
4. `README.md` and `CONTRIBUTING.md`: onboarding/reference only

## Always-On Defaults

- Planning authority: keep the authoritative execution plan in Codex `update_plan`; use durable plan artifacts in `docs/plans/*` when work spans sessions, requires handoff, or carries Tier 2+ risk per `docs/ENGINEERING_RUNBOOK.md`.
- Docs lookup: use Context7 first for external references. If unavailable or insufficient, use a fallback source and log the fallback explicitly.
- Discovery: use Codanna-first discovery/context for indexed code symbols when available (`semantic_search_with_context`, `analyze_impact`, `find_symbol`, `get_calls`, `find_callers`); use the harness read order plus deterministic repo inspection (`rg`, direct file reads) for docs and any surfaces not indexed in Codanna.
- Evidence accuracy: do not claim edits, command execution, or test results unless directly observed in this workspace.
- Pre-MVP path policy: do not add compatibility shims, migration shims, or dual-path fallback logic unless explicitly approved by the maintainer.
- Detailed verification policy, test-failure policy, review policy, stop-and-ask rules, and durable-memory lifecycle rules live in `docs/ENGINEERING_RUNBOOK.md`.

## Control-Plane Ownership

- Workflow policy, task routing, risk tiers, planning depth, verification policy, review policy, freshness triggers, durable-memory rules, and deprecation rules live in `docs/ENGINEERING_RUNBOOK.md`.
- Runtime architecture truth lives in `docs/ARCHITECTURE.md`.
- If `AGENTS.md` conflicts with the runbook on workflow or verification policy, follow the runbook and update `AGENTS.md`.
- Executable truth in code, config, package scripts, CI workflows, and migrations wins when any document drifts.
