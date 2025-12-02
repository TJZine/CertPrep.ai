# Code Review Implementation

This document describes how we expect code to be reviewed and what a reviewer should focus on when working in the CertPrep.ai repository.

The emphasis is on **security**, **data integrity**, and **offline‑first correctness**.

---

## Reviewer Persona

When reviewing code, adopt the mindset of a:

- **Security‑conscious full‑stack engineer**
  - Verify per‑user data isolation (Supabase RLS + Dexie `user_id` scoping).
  - Ensure no secrets, tokens, or private URLs are leaked in code or logs.
- **Offline‑first correctness advocate**
  - Local operations must succeed without network and be queued for sync.
  - No user data should be lost due to sync conflicts or migrations.
- **UX & accessibility guardian**
  - Maintain keyboard navigation, focus states, and ARIA attributes.
  - Use the shared `Modal` and mobile header patterns consistently.

Use `agents.md` at the repo root as the source of truth for higher‑level process and persona guidance.

---

## What to Look For in PRs

### 1. Data & Sync

- Dexie:
  - Are new fields indexed appropriately in `src/db/index.ts`?
  - Do migrations handle legacy records without throwing or losing data?
  - Is per‑user scoping enforced (e.g., `user_id` on quizzes/results and queries filtered by user)?
- Supabase:
  - Are `from('...')` calls always filtered by `user_id` (or similar) with RLS aligned?
  - Do upserts only send the expected fields (no secrets, no internal flags)?
  - Are errors logged with `logger` and not swallowed?
- Sync:
  - Results: `src/lib/sync/syncManager.ts`.
  - Quizzes: `src/lib/sync/quizSyncManager.ts` and `quizDomain.ts`.
  - Check conflict resolution logic, cursor handling, and time‑budgeting.

### 2. Sanitization & Security

- All HTML or rich text should go through `sanitize.ts` (DOMPurify wrapper).
- Avoid `dangerouslySetInnerHTML` unless the input is explicitly sanitized.
- Validate user input at the boundary:
  - Zod schemas (e.g., `src/validators/quizSchema.ts`) should guard imports and forms.
  - Server routes must re‑validate inputs even if the client validates them.

### 3. UI, Modals, and Mobile Header

- Modals:
  - Use the shared `Modal` (`src/components/ui/Modal.tsx`) so scroll‑locking logic stays centralized.
  - Ensure focus is trapped inside the modal and restored correctly on close.
- Mobile header / navigation:
  - Keep ESC‑to‑close and keyboard navigation intact.
  - Ensure new focusable elements are included in any focus‑trap logic.

### 4. Tests & Observability

- Ask whether new behavior is covered by:
  - Unit tests (e.g., `tests/unit/*`).
  - Sync behavior and migrations where regressions are risky.
- Logging:
  - Use `logger` (`src/lib/logger.ts`) instead of `console.*` in production paths.
  - Avoid logging sensitive data; log IDs and context, not raw answers or secrets.

---

## Lightweight Review Checklist

Before approving a PR:

- [ ] Data access is scoped per user (Dexie + Supabase).
- [ ] New Supabase calls have sensible RLS assumptions and `user_id` filters.
- [ ] Dexie migrations are safe and backward‑compatible.
- [ ] Input validation and sanitization are in place.
- [ ] Modals and mobile navigation respect accessibility constraints.
- [ ] No new secrets or credentials are introduced.
- [ ] Tests and basic manual verification steps are provided or updated.

If any of these are missing for a risky change, request revisions or follow‑up tasks.

---

## When in Doubt

- Prefer small, incremental changes over large, sweeping refactors.
- Defer non‑critical cleanup to a follow‑up PR rather than blocking a fix.
- If a change touches sync, migrations, or security:
  - Consider pairing review or a second reviewer with context.
  - Explicitly call out rollout / rollback plans in the PR description.

Refer to `README.md`, `docs/ARCHITECTURE.md`, and `SECURITY.md` for additional context when reviewing changes that impact architecture or security.*** End Patch ***!
