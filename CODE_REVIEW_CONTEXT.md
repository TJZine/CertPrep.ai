# Technical Stack

| Component    | Detected                                                        | Confidence |
| ------------ | --------------------------------------------------------------- | ---------- |
| Language     | TypeScript (Strict)                                             | High       |
| Framework    | Next.js 16 (App Router) + React 19                              | High       |
| Database     | Dexie.js (IndexedDB local) + Supabase (Remote PostgreSQL)       | High       |
| Architecture | Offline-First Sync Architecture (Local DB primary write source) | High       |
| Testing      | Vitest (Unit/Integration) + Playwright (E2E)                    | High       |

# Inferred Business Context

- **Domain**: EdTech / Certification Preparation (CertPrep.ai)
- **Data Sensitivity**: Medium (User authentication, learning progress, subscription/entitlement data typical of such platforms)
- **Criticality**: Customer-Facing Application
- **Compliance Considerations**: Potential GDPR/CCPA considerations due to user account data. Sentry is used for error tracking, which requires PII scrubbing.

# Code Quality Baseline

- **Maturity**: Production-ready. Includes complete E2E suites, CI tools (Husky, lint-staged), error tracking (Sentry), and analytics (Vercel Speed Insights).
- **Consistency**: High. Enforced by ESLint, Prettier, and strict project constraints (e.g., specific filename `src/proxy.ts` for middleware).
- **Test Coverage**: High. Both unit testing (Vitest + Testing Library) and E2E testing (Playwright) are actively maintained.
- **Documentation**: Structured and strict. Project relies on explicit architectural rules (e.g., `src/db/**` and `src/lib/sync/**` are critical).
- **Security Posture**: Strong. Specific sanitization pipelines (`src/lib/sanitize` using `isomorphic-dompurify`) are mandated to prevent XSS. Secrets are checked via CI scripts (`scripts/check-secrets.sh`).

# Team & Project Signals

- **Estimated Team Experience**: Senior/Advanced. The use of offline-first sync models, strict typing, and comprehensive testing indicates a mature engineering culture.
- **Development Velocity Pressure**: Balanced. The project explicitly prefers "incremental, low-risk changes with clear validation steps" over rushed features.
- **Technical Debt Level**: Low/Managed. Refactoring and systematic debugging workflows are formalized.

# Context Adjustments Applied

- **Offline-First Constraint**: Any suggestion to write directly to Supabase from the UI is an automatic 10/10 Critical failure and must be blocked. All data flow must be Component -> Dexie -> Sync Worker -> Supabase.
- **Sanitization Strictness**: Suggestions involving `dangerouslySetInnerHTML` without going through the central `sanitizeHTML` utility will be flagged as high-risk security issues.
- **Middleware Naming**: Any linter or reviewer suggestion to rename `src/proxy.ts` to `middleware.ts` will be flagged as an invalid (false positive) suggestion per project rules.
