# TODO / Backlog (Import integrity fixes tracked elsewhere)

- **Quiz route UX**: Replace `src/app/quiz/[id]/page.tsx` placeholder with an auto-redirect or mode selector that preserves keyboard/focus behavior and mobile header constraints.
- **Import UX hardening**: Add preflight validation (non-destructive) with clear toasts, and enforce upload size/type limits to avoid oversized or wrong-file imports before parsing.
- **Schema enforcement**: Introduce client-side schema for stored results (mirroring quizzes) and guard against orphaned result references during ingest; surface a summary of skipped items.
- **Sanitization safety**: If the DOMPurify allowlist changes, add/adjust sanitizer tests to cover allowed tags/attrs and confirm bundle impact stays acceptable.
- **Analytics scalability**: Cache/memoize aggregates and consider pagination/virtualization for large quiz/result sets to reduce render and compute churn.
- **Observability & recovery**: Log import/export outcomes (counts, errors) locally for supportability and add a lightweight DB health check screen to guide users through self-recovery steps.

## Further Recommendations
- **Resilience tests**: Add automated regression covering backup export/import round-trips and Dexie schema migrations to catch breaking changes early.
- **Accessibility audits**: Run periodic axe/keyboard audits on quiz flows and modals to ensure focus traps, ARIA labels, and screen-reader cues stay intact.
- **Offline robustness**: Add graceful offline messaging around fetches (e.g., library manifest) and queue retries for sync-like flows to prevent silent failures.
- **Performance budget**: Track bundle size and add alerts when dependencies or sanitizer allowlist changes expand the bundle beyond a target threshold.
- **Documentation drift guard**: Link AGENTS/validation expectations into PR templates to keep sanitization, modal usage, and mobile header constraints top-of-mind for contributors.
