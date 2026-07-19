# Browser Audit Remediation Ledger

Status: completed
Owner: Codex
Last Reviewed: 2026-07-19
Risk: Tier 2

## Goal

Resolve the confirmed defects from the 2026-07-19 normal-security visual,
functional, accessibility, diagnostics, and PWA browser audit without changing
the local-first architecture, persistence schema, or service-worker caching
contract.

The source audit evidence is stored outside the repository at:

`/Users/tristan/.codex/visualizations/2026/07/19/019f794d-36ad-7823-bd6c-14d0f355b8d9/certprep-browser-audit`

## Locked Decisions

- Fix confirmed defects only; do not fold in broad redesign or unrelated
  refactoring.
- Preserve sanitized rich-text rendering. Flashcards must reuse the established
  safe renderer rather than introduce unsanitized HTML injection.
- Preserve `result.mode` storage compatibility. Display aggregated session
  semantics from `session_type` without a persistence migration or dual write
  path.
- Treat the internal per-user SRS quiz as implementation data and exclude it
  from user-facing quiz counts.
- Preserve guest local-first saves. Missing authentication during an optional
  post-save sync is an expected guest state, not an error.
- Reject reset-password submissions unless the verified Supabase PKCE callback
  issued a matching short-lived HttpOnly recovery proof and an active session
  still exists.
- Do not alter proxy, callback, CAPTCHA, or deployed Supabase configuration as
  part of the local password-recovery UI fix.
- Keep normal browser security enabled and service workers allowed in final
  regression verification.
- Do not perform destructive testing against the maintainer's manual-test
  account.

## Issue Ledger

| ID    | Severity | Finding                                                                                     | Package                  | Status    |
| ----- | -------- | ------------------------------------------------------------------------------------------- | ------------------------ | --------- |
| BA-01 | P1       | Mobile and authenticated-tablet header causes document overflow; mobile menu ignores Escape | Responsive shell         | Completed |
| BA-02 | P2       | Flashcards render supported HTML markup as literal text                                     | Flashcard content        | Completed |
| BA-03 | P2       | Forgot/reset page wrappers add scrollbar-width overflow                                     | Responsive shell         | Completed |
| BA-04 | P2       | Password recovery is missing from login and direct reset URLs remain actionable             | Authentication recovery  | Completed |
| BA-05 | P2       | Interleaved and Topic Study results are labeled as Zen                                      | Results semantics        | Completed |
| BA-06 | P2       | Dashboard quiz metric counts the hidden SRS system quiz                                     | Dashboard/data semantics | Completed |
| BA-07 | P2       | Guest Proctor completion logs missing optional sync authentication as an error              | Dashboard/data semantics | Completed |
| BA-08 | P2       | Mobile Share and Print result controls have no accessible name                              | Results semantics        | Completed |
| BA-09 | P3       | Count-up study timers are announced as time remaining                                       | Accessibility            | Completed |
| BA-10 | P3       | Flashcard completion and interrupted Interleaved states lack a proper page heading          | Accessibility            | Completed |
| BA-11 | P3       | Dashboard warning and Analytics study controls have undersized touch targets                | Accessibility            | Completed |

## Package Acceptance Criteria

### Responsive Shell: BA-01, BA-03

Primary files:

- `src/components/layout/Header.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`
- `tests/e2e-production/responsive-shell.spec.ts`
- focused header/auth-page tests

Acceptance:

- At 390x844, closed and open mobile navigation does not increase document
  `scrollWidth` beyond `clientWidth`.
- Escape closes the open mobile menu and restores focus to its trigger.
- Opening the full-screen compact menu moves focus inside it and Tab/Shift+Tab
  remain contained until the menu closes.
- At 820x1180, authenticated header content fits without horizontal document
  overflow or clipped account controls.
- Desktop navigation remains unchanged at 1440x900.
- Forgot/reset page wrappers do not add scrollbar-width overflow.

Rollback:

- Revert the responsive-shell package as one unit. It has no storage or server
  contract impact.

### Flashcard Content: BA-02

Primary files:

- `src/components/flashcard/FlashcardCard.tsx`
- focused Flashcard tests

Acceptance:

- Supported question and explanation markup renders consistently with the quiz
  and results surfaces.
- Unsafe markup is sanitized by an existing shared renderer.
- Structured rich text retains list spacing and readable theme-aware colors in
  both light and dark/custom themes.
- Plain text and missing explanations continue to render correctly.

Rollback:

- Revert the renderer substitution and its focused tests together.

### Authentication Recovery: BA-04

Primary files:

- `src/components/auth/LoginForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/reset-password/actions.ts`
- `src/lib/auth/recoveryProof.ts`
- focused authentication tests

Acceptance:

- Login exposes a keyboard-accessible link to `/forgot-password`.
- `/reset-password` without a recovery code/token displays an invalid or expired
  recovery-link state and does not expose an actionable update form.
- The server callback-established recovery session is carried by a random query
  nonce matched against a short-lived, path-scoped HttpOnly cookie issued only
  after Supabase reports verified recovery provenance.
- The reset client receives only the server-validated expected recovery user ID
  and confirms that the active session has the same user before exposing
  password fields and again immediately before updating.
- A successful password update expires the path-scoped HttpOnly proof.
- Non-recovery codes cannot enter an actionable reset flow.
- Recovery state is reset when client-side URL/search parameters change.
- No proxy, CAPTCHA, or Supabase configuration changes are introduced.

Rollback:

- Revert the two form changes and focused tests together.

### Results Semantics: BA-05, BA-08

Primary files:

- `src/components/results/ResultsContainer.tsx`
- `src/components/results/ResultsSummary.tsx`
- `src/components/results/Scorecard.tsx`
- focused results tests

Acceptance:

- Interleaved and Topic Study results use their session-specific display labels
  instead of Zen labels.
- Standard Zen and Proctor results remain unchanged.
- Mobile Share and Print controls retain accessible names when visible text is
  hidden.

Rollback:

- Revert the display-only result package. No stored result migration is needed.

### Dashboard/Data Semantics: BA-06, BA-07

Primary files:

- `src/hooks/useDashboardStats.ts`
- `src/hooks/useExamSubmission.ts`
- focused hook tests

Acceptance:

- User-facing dashboard quiz totals exclude the internal SRS quiz and agree
  with the visible certification-exam count.
- Authenticated synchronization failures remain observable.
- Guest completion skips optional remote sync without error-level console
  output and preserves the local result.

Rollback:

- Revert hook changes and focused tests. No persistence contract changes.

### Accessibility: BA-09, BA-10, BA-11

Primary files:

- `src/components/quiz/QuizLayout.tsx`
- `src/components/flashcard/FlashcardSummary.tsx`
- `src/app/interleaved/session/page.tsx`
- `src/components/dashboard/QuizCard.tsx`
- `src/components/analytics/TopicHeatmap.tsx`
- focused component tests

Acceptance:

- Count-up study timers are announced as elapsed time; countdown callers can
  still provide remaining-time semantics if present.
- Flashcard completion and missing Interleaved-session states have a logical H1
  page heading.
- Icon-only warning/study controls expose at least a 24x24 CSS-pixel target
  without reducing their existing accessible names or focus visibility.

Rollback:

- Revert accessibility changes by component; no stored-data impact.

## Verification Gates

Focused gates:

- New or updated unit/component tests for every issue package.
- `npm run lint`
- `npm run typecheck`
- `git diff --check`

Full Tier 2 gates:

- `npm run verify`
- `npm run security-check`
- `npm run build`
- `npm run test:e2e:production`
- Targeted normal-security browser checks at 1440x900, 820x1180, and 390x844.

`npm run test:e2e` is required if implementation changes E2E bootstrap,
Playwright browser-security behavior, or runtime paths only covered by the main
E2E harness. Otherwise, run focused existing E2E specifications where
practical and record any environment limitation.

## Final Review Gate

Before completion:

1. Review the complete diff for scope creep, unsafe HTML rendering, auth/session
   regressions, guest-save behavior, and responsive breakpoint interactions.
2. Reproduce each audit issue against the changed production build.
3. Confirm PWA offline route isolation still passes with normal browser
   security.
4. Update every ledger status and record exact verification results.
5. Issue a fresh release recommendation.

## Completion Evidence

Completed on 2026-07-19.

- `npm run verify`: passed; 140 test files passed, 1 skipped; 837 tests
  passed, 3 skipped.
- `npm run security-check`: passed.
- `git diff --check`: passed.
- `npm run build`: passed, including production compilation, type validation,
  page-data collection, and route registration.
- `npm run test:e2e:production`: passed, 7/7. This normal-security harness
  allowed service workers and covered offline route isolation plus responsive
  shell behavior at 390x844, 820x1180, 1280x900, and 1440x900.
- `npm run test:e2e`: passed; 112 tests passed and 2 were intentionally
  skipped across authenticated and guest projects.
- Final in-app production-browser regression used a new tab/session with
  browser security enabled and service workers allowed. Login, forgot-password,
  and reset-password had no document overflow at 390x844, 820x1180, or
  1440x900. Compact-menu focus moved inside, wrapped with Shift+Tab, and
  returned to the trigger on Escape.
- A disposable sample quiz confirmed the dashboard visible-quiz total,
  sanitized structured flashcard markup, semantic dark-theme text/list-marker
  colors, and the flashcard-completion H1. The imported quiz was deleted after
  verification.
- Direct `/reset-password` visits exposed no password fields and displayed
  `Reset Link Unavailable`.
- The final live-browser diagnostic log contained no hydration warnings, React
  warnings, CSP violations, service-worker errors, or uncaught exceptions. The
  only repeated message was the expected localhost-only Vercel Speed Insights
  script miss.
- Independent correctness and UI re-review found no remaining material issue
  in the remediated surfaces. The auth review specifically verified recovery
  proof-to-user binding, submit-time A-to-B session rejection, and proof
  consumption.

## Release Recommendation

**GO** for the browser-audit remediation scope. All eleven confirmed findings
are closed, both production and functional browser suites pass, and the final
normal-security regression found no remaining release blocker. The local
Speed Insights script miss is a development-environment limitation, not an
application defect.

## Non-Goals

- Broad visual redesign.
- Persistence or database migrations.
- Service-worker lifecycle changes.
- CAPTCHA host configuration changes.
- Destructive account or local-data testing against a non-disposable account.
- Large component decomposition unrelated to a confirmed finding.
