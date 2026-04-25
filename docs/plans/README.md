# Plan Lifecycle

`docs/plans/*` stores durable plan and handoff artifacts, not repo-wide workflow policy.

Required lifecycle metadata near the top of every plan file:

- `Status:` one of `active`, `completed`, `archived`, or `reference-only`
- `Owner:` maintainer, team, or workflow currently responsible for the plan
- `Last Reviewed:` `YYYY-MM-DD`

Working rules:

- Only one `active` plan should exist per initiative.
- If a plan is historical, incomplete, superseded, or waiting for human confirmation, mark it `reference-only` instead of leaving it ambiguous.
- If a plan file lacks lifecycle metadata, treat it as `reference-only` until it is updated.
- Reference-only plans must clearly mark branch names, mergeability statements, rollout state, and other time-bound assumptions as historical/stale context rather than live repo truth.
- Plan files are durable memory only. `AGENTS.md`, `docs/ENGINEERING_RUNBOOK.md`, and `docs/ARCHITECTURE.md` remain the control-plane authorities.
