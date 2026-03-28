# Desloppify baseline (2026-03-21)

- Branch: desloppify/code-health
- Commit: da723cf
- desloppify: desloppify 0.9.12

## desloppify scan --path .

```

Desloppify Scan (typescript)

  ℹ Excluded directory 'playwright-report' has 0 references from scanned code — may be stale
  ℹ Excluded directory '.worktrees' has 0 references from scanned code — may be stale
  ℹ Excluded directory 'lighthouse-reports' has 0 references from scanned code — may be stale
  Scan complete
  ──────────────────────────────────────────────────
  -20 resolved
  ⚠ Skipped auto-resolve for: boilerplate_duplication, review (returned 0 — likely transient)
  Scores: overall 71.5/100 (+0.6)  objective 84.4/100 (+2.5)  strict 71.5/100 (+0.6)  verified 84.4/100 (+2.5)
  Score guide:
    overall  = 25% mechanical + 75% subjective (lenient — ignores wontfix)
    objective = mechanical detectors only (no subjective review)
    strict   = like overall, but wontfix counts against you  <-- your north star
    verified = strict, but only credits scan-verified fixes
  Strict 71.5 (target: 95.0)
  ⚠ Subjective integrity: 1 dimension matched the target (near target). Re-review recommended.
    This warning has repeated. Prefer `desloppify review --prepare` and run a trusted review (see skill doc for options).
  * 639 issues hidden (showing 10/detector). Use `desloppify show <detector>` to see all.
  Scorecard dimensions (matches scorecard.png):
  File health        ██████████████░  94.2%  (strict  94.2%)
  AI generated debt  ██████████████░  90.0%  (strict  90.0%)
  API coherence      █████████████░░  85.0%  (strict  85.0%)
  Abstraction fit    ██████████████░  95.0%  (strict  95.0%)
  Auth consistency   ████░░░░░░░░░░░  30.0%  (strict  30.0%)
  Code quality       ██████████████░  92.8%  (strict  92.7%)
  Convention drift   ███████████░░░░  75.0%  (strict  75.0%)  [stale — re-review]
  Cross-module arch  █████████░░░░░░  60.0%  (strict  60.0%)
  Dep health         ██████████░░░░░  65.0%  (strict  65.0%)
  Design coherence   ██████████░░░░░  65.0%  (strict  65.0%)  [stale — re-review]
  Duplication        ███████████████  99.8%  (strict  99.8%)
  Elegance           █████████░░░░░░  56.7%  (strict  56.7%)
  Error consistency  ██████░░░░░░░░░  40.0%  (strict  40.0%)  [stale — re-review]
  Init coupling      █████████░░░░░░  60.0%  (strict  60.0%)
  Logic clarity      █████████░░░░░░  60.0%  (strict  60.0%)
  Naming quality     ██████████░░░░░  65.0%  (strict  65.0%)
  Security           ███████████████  98.6%  (strict  98.6%)
  Stale migration    ███████████████  98.0%  (strict  98.0%)
  Structure nav      ███████░░░░░░░░  45.0%  (strict  45.0%)
  Test health        ████░░░░░░░░░░░  26.9%  (strict  26.9%)

  Score recipe:
    overall = 25% mechanical + 75% subjective
    Pool averages: mechanical 84.4% · subjective 67.2%
    Biggest weighted drags:
      - Mid elegance: -7.38 pts (score 45.0%, 17.9% of subjective pool)
      - High elegance: -4.70 pts (score 65.0%, 17.9% of subjective pool)
      - Test health: -3.05 pts (score 26.9%, 16.7% of mechanical pool)
      - Low elegance: -2.93 pts (score 60.0%, 9.8% of subjective pool)
      - Design coherence: -2.13 pts (score 65.0%, 8.1% of subjective pool)

  Moved:
    Code quality           86.4% → 92.8%  (+6.4%)  strict: 86.3→92.7% (+6.4%)
    Duplication            91.2% → 99.8%  (+8.6%)  strict: 91.2→99.8% (+8.6%)

  Coverage reduced (next_lint): next lint tooling unavailable (parser_error) Repercussion: Detector results may be under-reported for this scan. Fix: Install/fix the tool command and rerun scan.

  → ⚠ 12 security issues — review before other cleanup. 759 issues open. Test health (26.9%) needs attention — run `desloppify next` to start. (36 review work items — run `desloppify show review --status open`)
  Run `desloppify next` for the highest-priority item.
  Run `desloppify plan` to see the updated living plan.
  Run `desloppify status` for the full dashboard.

  Scorecard → scorecard.png
  💡 Ask the user if they'd like to add it to their README with:
     <img src="scorecard.png" width="100%">
     (disable: --no-badge | move: --badge-path <path>)
────────────────────────────────────────────────────────────
INSTRUCTIONS FOR LLM
IMPORTANT: ALWAYS present ALL scores to the user after a scan.
Show overall health (lenient + strict), ALL dimension scores,
AND all subjective dimension scores in a markdown table.
The goal is to maximize strict scores. Never skip the scores.

LIVING PLAN ACTIVE: 36 ordered, 2 skipped.
The plan is the single source of truth for work order.
Use `desloppify next` which respects the plan.
Use `desloppify plan` to view and update it.

Overall score:   71.5/100
Objective score: 84.4/100
Strict score:    71.5/100
Verified score:  84.4/100
Score guide:
  overall  = 25% mechanical + 75% subjective (lenient — ignores wontfix)
  objective = mechanical detectors only (no subjective review)
  strict   = like overall, but wontfix counts against you  <-- your north star
  verified = strict, but only credits scan-verified fixes

| Dimension | Health | Strict | Issues | Tier | Action |
|-----------|--------|--------|--------|------|--------|
| Code quality | 92.8% | 92.7% | 245 | T3 | autofix |
| Duplication | 99.8% | 99.8% | 2 | T3 | refactor |
| File health | 94.2% | 94.2% | 19 | T3 | refactor |
| Security | 98.6% | 98.6% | 13 | T4 | move |
| Test health | 26.9% | 26.9% | 182 | T4 | autofix |
| **Subjective Dimensions** | | | | | |
| AI generated debt | 90.0% | 90.0% | 0 | T4 | review |
| API coherence | 85.0% | 85.0% | 1 | T4 | review |
| Abstraction fit | 95.0% | 95.0% | 0 | T4 | review |
| Auth consistency | 30.0% | 30.0% | 2 | T4 | review |
| Convention drift | 75.0% | 75.0% | 1 | T4 | review |
| Cross-module arch | 60.0% | 60.0% | 1 | T4 | review |
| Dep health | 65.0% | 65.0% | 2 | T4 | review |
| Design coherence | 65.0% | 65.0% | 8 | T4 | review |
| Elegance | 56.7% | 56.7% | 9 | T4 | review |
| Error consistency | 40.0% | 40.0% | 3 | T4 | review |
| Init coupling | 60.0% | 60.0% | 3 | T4 | review |
| Logic clarity | 60.0% | 60.0% | 1 | T4 | review |
| Naming quality | 65.0% | 65.0% | 1 | T4 | review |
| Stale migration | 98.0% | 98.0% | 0 | T4 | review |
| Structure nav | 45.0% | 45.0% | 1 | T4 | review |

Biggest score drags (fixing these dimensions has the most impact):
  - Mid elegance: -7.38 pts (score 45.0%, 17.9% of subjective pool)
  - High elegance: -4.70 pts (score 65.0%, 17.9% of subjective pool)
  - Test health: -3.05 pts (score 26.9%, 16.7% of mechanical pool)
  - Low elegance: -2.93 pts (score 60.0%, 9.8% of subjective pool)
  - Design coherence: -2.13 pts (score 65.0%, 8.1% of subjective pool)

Total issues: 835 | Open: 759 | Fixed: 75 | Wontfix: 0


Follow the living plan: `desloppify next` for your next execution task,
`desloppify backlog` for broader backlog discovery, and `desloppify plan` for plan details.
Current status: ⚠ 12 security issues — review before other cleanup. 759 issues open. Test health (26.9%) needs attention — run `desloppify next` to start. (36 review work items — run `desloppify show review --status open`)
Strategy: 5 independent workstreams, safe to parallelize. Rescan after each phase to verify. Review: 36 issue(s) — `desloppify show review --status open`.
Top action: `desloppify autofix unused-imports --dry-run` — 1 unused issues — run `desloppify autofix unused-imports --dry-run` to preview, then apply

A scorecard image was saved to `scorecard.png`.
Let the user know they can view it, and suggest adding it
to their README: `<img src="scorecard.png" width="100%">`
────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  Hey — please follow the living plan. Run `desloppify    │
  │  next` for your next execution task. No need to reply,   │
  │  just continue.                                          │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

```

## desloppify status

```

  Scores: overall 71.5/100 · objective 84.4/100 · strict 71.5/100 · verified 84.4/100
  Score guide: overall (lenient) · objective (mechanical only) · strict (penalizes wontfix) · verified (scan-confirmed only)
  Strict 71.5 (target: 95.0) — run `desloppify next` to find the next improvement
  331 files · 53K LOC · 79 dirs · Last scan: 2026-03-21T21:35:16+00:00
  open (in-scope): 759 · open (out-of-scope carried): 0 · open (global): 759

  Dimension               Checks  Health  Strict  Bar                    Tier  Action
  ──────────────────────────────────────────────────────────────────────────────────────
  Code quality             1,897   92.8%   92.7%  ███████████████████░  T3  autofix
  Security                   501   98.6%   98.6%  ████████████████████  T4  move
  File health                250   94.2%   94.2%  ███████████████████░  T3  refactor
  Duplication                389   99.8%   99.8%  ████████████████████  T3  refactor
  Test health              2,703   26.9%   26.9%  █████░░░░░░░░░░░░░░░  T4  autofix ←
  ── Subjective Measures (matches scorecard.png) ──────────────────────
  AI generated debt            —   90.0%   90.0%  ██████████████████░░  T4  review   [open issues: 0]
  API coherence                —   85.0%   85.0%  █████████████████░░░  T4  review   [open issues: 1]
  Abstraction fit              —   95.0%   95.0%  ███████████████████░  T4  review   [open issues: 0]
  Auth consistency             —   30.0%   30.0%  ██████░░░░░░░░░░░░░░  T4  review   [open issues: 2]
  Convention drift             —   75.0%   75.0%  ███████████████░░░░░  T4  review   [stale] [open issues: 1]
  Cross-module arch            —   60.0%   60.0%  ████████████░░░░░░░░  T4  review   [open issues: 1]
  Dep health                   —   65.0%   65.0%  █████████████░░░░░░░  T4  review   [open issues: 2]
  Design coherence             —   65.0%   65.0%  █████████████░░░░░░░  T4  review   [stale] [open issues: 8]
  Elegance                     —   56.7%   56.7%  ███████████░░░░░░░░░  T4  review   [open issues: 9]
  Error consistency            —   40.0%   40.0%  ████████░░░░░░░░░░░░  T4  review   [stale] [open issues: 3]
  Init coupling                —   60.0%   60.0%  ████████████░░░░░░░░  T4  review   [open issues: 3]
  Logic clarity                —   60.0%   60.0%  ████████████░░░░░░░░  T4  review   [open issues: 1]
  Naming quality               —   65.0%   65.0%  █████████████░░░░░░░  T4  review   [open issues: 1]
  Stale migration              —   98.0%   98.0%  ████████████████████  T4  review   [open issues: 0]
  Structure nav                —   45.0%   45.0%  █████████░░░░░░░░░░░  T4  review   [open issues: 1]
  Health = open penalized | Strict = open + wontfix penalized
  Action: fix=auto-fixer | move=reorganize | refactor=manual rewrite | manual=review & fix
  [stale] = assessment outdated

  Score recipe:
    overall = 25% mechanical + 75% subjective
    Pool averages: mechanical 84.4% · subjective 67.2%
    Biggest weighted drags:
      - Mid elegance: -7.38 pts (score 45.0%, 17.9% of subjective pool)
      - High elegance: -4.70 pts (score 65.0%, 17.9% of subjective pool)
      - Test health: -3.05 pts (score 26.9%, 16.7% of mechanical pool)
      - Low elegance: -2.93 pts (score 60.0%, 9.8% of subjective pool)
      - Design coherence: -2.13 pts (score 65.0%, 8.1% of subjective pool)

  Focus: Test health (26.9%) — fix 182 items

  WARNING: 1 subjective dimension is parked on the scoring target. Re-run that review with evidence-first scoring before treating this score as final.
  Next step: `desloppify review --prepare --force-review-rerun --dimensions abstraction_fitness`

  Review: 36 issues open, 36 uninvestigated — `desloppify show review --status open`
  Test health tracks coverage + review; review work items track issues found.


  ── Structural Debt by Area ──
  Create a task doc for each area → farm to sub-agents for decomposition

Area                                        Items   Tiers       Open   Debt   Weight
─────────────────────────────────────────────────────────────────────────────────────
src/components                              199     T3:195 T4:4  199    0      601
src/app                                     119     T3:119 T4:0  119    0      357
src/lib                                     55      T3:55 T4:0  55     0      165
src/hooks                                   48      T3:48 T4:0  48     0      144
tests/e2e                                   22      T3:22 T4:0  22     0      66
src/db                                      19      T3:19 T4:0  19     0      57
tests/unit                                  15      T3:15 T4:0  15     0      45
src/stores                                  6       T3:6 T4:0   6      0      18
src/proxy.ts                                5       T3:5 T4:0   5      0      15
playwright.config.ts                        4       T3:4 T4:0   4      0      12
.agent/skills                               2       T3:2 T4:0   2      0      6
src/instrumentation-client.ts               2       T3:2 T4:0   2      0      6
src/types                                   2       T3:2 T4:0   2      0      6
src/instrumentation.ts                      2       T3:2 T4:0   2      0      6
src/data                                    2       T3:2 T4:0   2      0      6

  ... and 12 more areas

  Workflow:
    1. desloppify show <area> --status wontfix --top 50
    2. Create tasks/<date>-<area-name>.md with decomposition plan
    3. Farm each task doc to a sub-agent for implementation

  AGENT PLAN (use `desloppify next` to see your next task):
  Living plan active: Queue: 36 items (36 planned · 2 skipped)
  Next command: `desloppify next`
  View plan: `desloppify plan`
  -> ⚠ 12 security issues — review before other cleanup. 759 issues open. Test health (26.9%) needs attention — run `desloppify next` to start. (36 review work items — run `desloppify show review --status open`)


```

## desloppify next --count 20

```

  Queue: 0 items

  Queue cleared!
  Frozen plan-start: strict 71.5 → Live estimate: strict 71.5
  Run `desloppify scan` now to finalize and reveal your updated score.
```
