---
trigger: always_on
---

# Agent Playbook – CertPrep.ai

## Mission

- Ship CertPrep.ai features quickly while preserving correctness, accessibility, security, and performance.
- Prefer incremental, low-risk changes with clear validation steps.

## Temporary Spawned Subagent Guardrail

- This section overrides the MCP-first guidance below for spawned subagents only.
- Spawned subagents in this repo should prefer shell and local file tools first: `exec_command`, shell `rg`, `sed`, `cat`, `git`, `ls`, direct local file reads, local edits, and local verification commands.
- Spawned subagents should avoid MCP tools and app/connector tools for routine exploration, search, symbol lookup, documentation lookup, and convenience.
- Spawned subagents should not hand work back to the parent thread just because an MCP or app tool would be easier.
- If an MCP or app tool is genuinely necessary for correctness or explicitly required by the task, the subagent may call it normally. This repo guidance does not prohibit that escalation path, but approval behavior is controlled outside these files.
- Treat this as a temporary mitigation until spawned-subagent approval churn is resolved.

## Workflow (Codex + MCP)

1. Clarify scope and constraints
   - Confirm sandbox mode, approvals, network access, and deadlines.
   - Restate the task in 1–2 sentences before changing code.
2. Inspect context before coding
   - Main thread: use Codanna first for code understanding:
     - `semantic_search_with_context` → find relevant symbols and files.
     - `analyze_impact` → understand dependencies and change radius.
   - Spawned subagents: follow the temporary guardrail above and use shell/local-file tools first.
   - Use `rg`/`rg --files` for quick literal searches or file discovery.
   - Use `cat`/`sed` for small reads (≤ ~250 lines at a time).
3. Plan the work
   - Main thread: use context7 to retrieve relevant docs to better understand best practices.
   - Spawned subagents: avoid Context7 unless it is genuinely necessary or explicitly required.
   - utilize sequential thinking for planning.
   - For non-trivial tasks, create/update a short `update_plan` with 3–6 steps.
   - Keep steps small, testable, and ordered by dependency.
4. Implement changes
   - Prefer minimal, focused edits with `apply_patch`.
   - Implement with strict typing, accessibility, and security in mind; avoid `any`.
   - Main thread: when editing existing code, re-check impact with Codanna (`analyze_impact`) if the change could affect multiple call sites.
   - Spawned subagents: only use Codanna when it is genuinely necessary or explicitly required.
5. Validate behavior
   - Run targeted tests or scripts when feasible (`npm test`, `npm run lint`, `npm run build`, or feature-specific commands).
   - If validation cannot be run, call it out explicitly and describe how to validate.
6. Summarize the work
   - Summarize changes concisely with file references (e.g., `src/app/page.tsx:42`).
   - Note validation status and any follow-up risks or TODOs.

## Coding Principles

- TypeScript strictness: explicit return types, handle null/undefined, no implicit any.
- Security: sanitize user input (use `sanitizeHTML`), avoid `dangerouslySetInnerHTML` unless sanitized, protect secrets.
- Accessibility: ARIA labels for interactive elements, keyboard support, visible focus states.
- Performance: avoid unnecessary re-renders; memoize/derive state when helpful; keep dependencies light.
- Error handling: graceful fallbacks, user-friendly errors, no silent failures.

## New Constraints & Reminders (Mobile/Sanitization/Modals)

- Sanitization: Always use `sanitizeHTML` from `src/lib/sanitize` (isomorphic-dompurify) for any rendered HTML. Do not reintroduce SSR/CSR branches. If adjusting the allowlist, add/adjust tests.
- Modals: Use the shared `Modal` component so the global scroll-lock counter stays correct. Avoid writing to `document.body.style.overflow` elsewhere. If a change requires it, flag that `agents.md` may need updating.
- Mobile header: Preserve focus trap and Esc-close on the mobile menu. Include any new focusable elements in the trap logic.
- Overflow guards: Keep `overflow-x-hidden` on page shells (e.g., quiz layout) and use `break-words` on long text to prevent horizontal scroll. Only wrap intentional horizontal scrollers in `overflow-x-auto`.
- Bundle note: If expanding sanitization/rich text, verify allowed tags/attrs and, if concerned, run bundle analysis to confirm DOMPurify impact is acceptable.

## Available Tools (MCP)

- **Codanna (code graph/search)** – best for codebase queries and impact analysis.
- **Sequential Thinking** – log and review thought steps for complex tasks.
- **Ripgrep** – fast code/text search (`rg`/`rg --files`); prefer over `find`/`grep` for speed.
- **Fetch** – pull external URLs when allowed (network access may be restricted).
- **Context7** – fetch external library docs (resolve library ID then get docs).

When in doubt:

- Main thread: prefer Codanna for code understanding, `rg` for quick literal grep-style queries, and only then fall back to manual navigation.
- Spawned subagents: prefer shell/local-file inspection first and use Codanna only when it is genuinely necessary or explicitly required.

### Codanna MCP Tools

Tool priority (for this project):

- **Tier 1 (default entry points)**:
  - `semantic_search_with_context` – natural-language search with rich symbol + usage context.
  - `analyze_impact` – full dependency and change-radius analysis for a specific symbol.
- **Tier 2 (targeted lookups)**:
  - `find_symbol` – locate symbols by exact or fuzzy name.
  - `get_calls` – see what a function calls.
  - `find_callers` – see who calls a function.
- **Tier 3 (supporting tools)**:
  - `search_symbols` – broader/fuzzier symbol search when the name is unclear.
  - `semantic_search_docs` – search docs/comments by natural language.
  - `get_index_info` – confirm index status and languages indexed.

Recommended Codanna workflow:

1. Use `semantic_search_with_context` to find relevant functions/components/types from a natural-language query (e.g., “where do we render the practice exams list?”).
2. Use `analyze_impact` on key symbols before making changes to see:
   - Who calls them.
   - What they call.
   - Where they are composed or used as types.
3. Use `find_symbol`, `get_calls`, and `find_callers` for precise follow-ups:
   - Confirm you’ve covered all call sites before refactors.
   - Verify no unused or dead paths remain.
4. After implementing non-trivial changes, re-run `analyze_impact` on affected symbols to double-check that you considered all dependents.
5. Use `semantic_search_docs` when you need conceptual guidance from inline docs or comments (e.g., “how are attempts persisted offline?”).

## Productivity Tips

- Use `rg` for searches; `rg --files` for listings. Pipe to `sed -n` for context.
- Prefer `apply_patch` for focused edits; avoid destructive commands.
- Note sandbox/approval limits; request escalations only when necessary.
- Keep responses concise with actionable next steps and file references.

## Validation Checklist

- Lint/build/test status reported.
- Types and nullability covered.
- XSS/SSR safety reviewed when rendering user content.
- ARIA/keyboard/focus verified for interactive UI.
- Edge cases handled (empty lists, division by zero, timeouts).
