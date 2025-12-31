# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.3] - 2025-12-30

### Fixed

- **Schema Drift Safe-Guards**: Added runtime type-casting and documentation to handle database enum mismatches (e.g., `quiz_mode` lacking "flashcard").
- **E2E Stability**: Replaced brittle hard-coded `waitForTimeout` calls with standardization constants in `library.spec.ts`.

### Changed

- **Developer Experience**: Added `npm run supabase:types` script for generating strict TypeScript definitions from the Supabase project.
- **Sync Reliability**: Updated `client.ts` and sync managers to use strict `Database` generated types, preventing future type regression.
- **Performance**: Added Sentry performance spans (`quiz.sync.push`, `srs.sync.pull`, etc.) to sync managers for APM observability.
- **Analytics UX**: Increased `ExamReadinessCard` initial category display to 10 items with scrollable expansion.

## [1.4.2] - 2025-12-30

### Added

- **Flashcard Study Mode**: Interactive 3D flip cards, keyboard shortcuts, rating buttons, progress bar, and end-of-session summary.
- **Unified SRS Review**: Review Mode selector and dashboard practice entry for unified SRS review across quizzes.
- **Dashboard**: New card and modal to start review sessions.
- **Tests**: New unit and end-to-end tests for flashcard flows and storage.

### Changed

- **Style**: Theme-aware animated visuals and interactive code/template blocks with copy & line-number support.
- **Chores**: Minor version bump and housekeeping updates.

## [1.4.1] - 2025-12-24

### Fixed

- **Sync Auth Reliability**: Migrated sync managers from `getSession()` to `getUser()` to fix stale auth session errors. This validates sessions with the Supabase server on every sync, eliminating "No valid auth session" failures after page refresh.
- **Quiz Submission State**: Preserved `selectedAnswer` on hash failures so users can retry without re-selecting their answer.
- **Create Page Spacing**: Fixed layout overlap issues and improved visual design.
- **DB Init Error Handling**: Fixed a bug where database initialization errors were masked by the dashboard loading skeleton.
- **Analytics Mobile Layout**: Fixed horizontal overflow issues and enforced consistent mobile responsiveness across all Analytics dashboard cards.

### Added

- **Bundle Analyzer**: Added `@next/bundle-analyzer` for performance profiling (`ANALYZE=true npm run build`).
- **Browserslist Config**: Added `.browserslistrc` targeting modern browsers only, reducing polyfill bundle by ~30-50KB.
- **E2E Test Selectors**: Extracted spinner selector to shared constant for maintainability.
- **Interleaved Category Tests**: Added unit tests for case-insensitive and multi-category filtering.
- **Dashboard Tests**: Added comprehensive unit tests for `DashboardClient` covering loading, sorting, filtering, and interactions (~85% coverage).

### Changed

- **Code-Split Dashboard**: Lazy-load `DashboardClient` with `ssr: false` for faster initial page load.
- **Code-Split TopicRadar**: Lazy-load recharts-heavy components on results page (~50KB savings).
- **Quiz Navigation**: Disabled navigation controls during submission to prevent double-submit.
- **E2E Timeouts**: Increased timeout thresholds to account for `getUser()` auth latency (~50-200ms).
- **Playwright Retries**: Added 1 local retry as safety net for timing-sensitive tests.

## [1.4.0] - 2025-12-22

### Added

- **Interleaved Practice**: Multi-quiz aggregated sessions with category balancing for mixed practice across all imported quizzes (`/interleaved` page, `InterleavedPracticeCard` component).
- **Quiz Remix**: Shuffle question and answer order while maintaining answer key integrity for varied practice sessions.
- **Import Duplicate Detection**: Warning when importing a quiz with a matching title, with options to "Import as New" or "Replace Existing".
- **Session Type Classification**: Explicit `session_type` field (`standard`, `smart_round`, `srs_review`, `topic_study`, `interleaved`) for analytics identification.
- **Source Map Tracking**: `source_map` field on aggregated results enables "this question came from Quiz X" attribution in results review.
- **Create Your Own Tests Page**: New `/create` page with step-by-step guide for AI-powered quiz generation, including templates for 4 approaches (study material, style matching, question remix, answer key conversion).
- **Exam Category Alignment**: Interactive preset selector for aligning AI-generated categories with official exam blueprints (AWS SAA, CompTIA Security+, PMP, CISSP, etc.) to improve Topic Heatmap analytics.
- **AI Quiz Generator Documentation**: Comprehensive prompts and configurations for Gemini Gems and ChatGPT GPTs in `docs/ai-quiz-generators/`.
- **Gemini & OpenAI Brand Icons**: SVG icon components with `currentColor` theming for AI tool attribution.
- **E2E Timeout Constants**: Standardized timeout helpers in `tests/e2e/helpers/timeouts.ts` for consistent CI reliability.
- **Sentry Lazy Loading**: Replay integration now lazy-loaded after first user interaction to reduce initial bundle by ~150KB.
- **`useCopyToClipboard` Hook**: Shared clipboard hook with modern Clipboard API and deprecated `execCommand` fallback.
- **E2E SRS Review Tests**: New `srs-review.spec.ts` for SRS Review flow validation including seeding, session completion, and result persistence.
- **E2E Interleaved Practice Tests**: New `interleaved.spec.ts` for multi-category quiz aggregation flow testing.

### Changed

- **Quiz Schema Validation**: Added maximum of 8 options per question for schema validation.
- **Results Display**: Aggregated sessions now show source quiz attribution and category breakdown.
- **Settings Navigation**: Back button now returns to entry point (dashboard or results page) based on context.
- **Test Library Structure**: Reorganized `public/tests/` to use lowercase, hyphenated paths (e.g., `insurance/ma-personal-lines/practice-01.json`).
- **Aggregated Results**: Hide attempt history timeline for aggregate sessions (SRS/Topic/Interleaved) since each session has a unique question set.

### Fixed

- **Quiz Remix Answer Tracking**: Fixed incorrect answer detection when `correct_answer` is undefined (hash-only security mode).
- **CSP Nonce Hydration**: Replaced `next/script` with native `<script>` elements to prevent hydration mismatch warnings.
- **Category Banner**: Suppressed misleading "missing category" banner for aggregated sessions which use question-level categories.
- **E2E SRS Test Flakiness**: Fixed intermittent E2E failures caused by SyncProvider pulling real Supabase SRS data during tests. Added mocks for `srs` REST endpoint and `upsert_srs_lww_batch` RPC in E2E fixtures.

## [1.3.8] - 2025-12-20

### Added

- **Prefetch Utility**: New `src/lib/prefetch.ts` with SSR-guarded idle-time prefetch and deduplication.
- **Library Skeleton**: New `LibrarySkeleton.tsx` component replacing generic spinner for reduced CLS on library page.
- **Quiz Page Skeletons**: New `QuizLobbySkeleton.tsx` and `ZenQuizSkeleton.tsx` for quiz mode selection and zen mode pages.
- **CLS Audit Script**: New `scripts/cls-audit.mjs` for automated CLS measurement with seeded data states and multi-viewport support.
- **Lighthouse E2E Script**: New `scripts/lighthouse-e2e.mjs` for headless authenticated Lighthouse testing.

### Changed

- **Dashboard Modals**: Code-split `ImportModal`, `ModeSelectModal`, and `DeleteConfirmModal` using `next/dynamic` with idle-time prefetch for faster initial load.
- **Analytics Charts**: Code-split `PerformanceHistory` and `CategoryTrendChart` with skeleton fallbacks to reduce initial JS bundle.
- **Font Loading**: Disabled preload for theme-specific fonts (`Press_Start_2P`, `Playfair_Display`) to reduce FCP blocking.
- **Dashboard Skeleton**: Updated to use responsive `min-h` with `dvh` units for stable skeleton-to-content transitions across viewports.
- **Dashboard Skeleton**: Added `DueQuestionsCard` placeholder to prevent CLS when SRS card renders conditionally.
- **Dashboard Skeleton**: Increased quiz grid skeleton to 8 cards to better match typical user data.
- **Sentry Console Logging**: Added `consoleLoggingIntegration` for Sentry logging in server/edge configs with development-only `enableLogs`.

### Fixed

- **Import Security**: Added 10MB file size limit to `ImportModal` to prevent browser memory exhaustion from oversized JSON uploads.
- **CLS Regression**: Resolved 83-99% CLS regression on Dashboard, Analytics, and Library pages caused by skeleton/content height mismatch.

## [1.3.7] - 2025-12-16

### Added

- **Dashboard Skeleton**: Replaced generic loading spinner with dedicated skeleton UI that mimics the actual layout for seamless perceived loading.

### Changed

- **Mobile Header UX**: Enhanced logo animation with scale effects, added backdrop blur to mobile menu, improved menu toggle icon animation with rotation/opacity transitions.
- **Mobile Menu Accessibility**: Dynamic `aria-label` for menu toggle ("Open menu"/"Close menu"), added `aria-hidden` to decorative nav icons.
- **Analytics Overflow**: Added `overflow-x-hidden` to analytics page to prevent horizontal scroll on mobile.

## [1.3.6] - 2025-12-16

### Changed

- **Question Review List**: Implemented UI virtualization using `react-window` (v2) for improved performance with large question sets.
- **Database Schema**: Updated Dexie schema to v13, adding `category` and `subcategory` indexes to the `quizzes` table.
- **Middleware**: Refactored Content Security Policy (CSP) logic into `src/lib/security.ts` for better maintainability.

### Added

- **Dependencies**: Added `react-window` (^2.2.3) and `react-virtualized-auto-sizer` (^1.0.26) for UI virtualization.

## [1.3.5] - 2025-12-15

### Added

- **Quiz Category & Subcategory**: Quizzes now support `category` and `subcategory` fields for analytics grouping.
- **Topic Heatmap Enhancements**: Category-based performance visualization, "Focus here" links to Topic Study, weekly summary stats.
- **hashCache Eviction**: LRU-style eviction (10k entry cap) prevents unbounded IndexedDB growth.
- **Migration Guards**: Defensive `IF EXISTS` checks on index migrations.
- **Date Range Filter**: Analytics page now includes a date range filter (7d/30d/90d/All) with localStorage persistence.
- **Empty Card States**: Standardized empty state component for analytics cards with consistent messaging.
- **Recent Results Quiz Titles**: Recent Results card now displays quiz titles instead of IDs.

### Fixed

- **SRS Sync Logging**: Added debug log for backward-compat response handling.
- **Modal Vertical Scrolling**: Improved modal positioning with proper z-index layering.
- **TopicHeatmap Table Accessibility**: Header row now correctly nested inside `role="table"` container for proper screen reader association.
- **DifficultyBreakdown Progressbar Accessibility**: Added `role="progressbar"` with ARIA attributes for screen reader support.
- **DateRangeFilter Type Safety**: Exported `DATE_RANGE_VALUES` constant to prevent localStorage validation drift.

---

## [1.3.4] - 2025-12-15

### Added

- **Self-Assessment Summary**: New component showing difficulty ratings breakdown on results page.
- **Time Per Question Heatmap**: Visual display of time spent per question.
- **Category Drill-Down Links**: Direct links from analytics to category-filtered quizzes.

### Fixed

- **SRS Sync Metrics**: Corrected `updatedCount` to use server response.
- **Missing Category Indicators**: Warning icons for quizzes lacking category metadata.

---

## [1.3.3] - 2025-12-15

### Added

- **Comfort Mode**: Reduces visual effects for users sensitive to motion.
- **SRS Integration Display**: Shows SRS status on quiz results page.

### Fixed

- **Sync Reliability**: Atomic blocking, LWW reconciliation improvements.

---

## [1.3.2] - 2025-12-14

### Fixed

- **LWW Deletion Protection**: Server-side trigger prevents stale clients from resurrecting deleted records.
- **Sync Block TTL**: Fixed permanent sync blocks from TTL parsing issue.

---

## [1.3.1] - 2025-12-14

### Fixed

- **Code Review Fixes**: Invalid `practice` mode in tests, capped logging of `missingIds`, synthetic quiz ID uniqueness.
- **Result Validation**: Normalized `question.id` to string consistently.

---

## [1.3.0] - 2025-12-14

### Added

- **Spaced Repetition System (SRS)**: Leitner box algorithm for optimized review scheduling (`/study-due` page, `DueQuestionsCard` component).
- **SRS Supabase Sync**: Cross-device SRS progress sync with server-side LWW conflict resolution (`upsert_srs_lww_batch` RPC).
- **Topic Study Mode**: Targeted practice sessions generated from analytics weak areas (`/quiz/topic-review`).
- **Category Trend Charts**: Temporal proficiency visualization in Analytics (`CategoryTrendChart`, `useCategoryTrends` hook).
- **Topic Heatmap**: Visual category performance overview (`TopicHeatmap` component).
- **Storage Maintenance**: Purge deleted data (tombstones) from local storage to free up space (Settings → Data Management).
- **Sync Blocked Banner**: UI indicator when sync is unavailable (`SyncBlockedBanner`).

### Changed

- **Node.js Requirement**: Updated minimum version to `>=20.9.0` to match Next.js 16.
- **Quiz Submission**: Now initializes SRS state for answered questions automatically.
- **Analytics Page**: Added trend charts and heatmap visualizations.
- **Sync Provider**: Improved state management and error handling.

### Fixed

- **Modal Accessibility**: Added focus restoration when modals close (WCAG 2.1 SC 2.4.3).
- **Topic Study**: Excluded soft-deleted quizzes from topic study query.
- **Result Validation**: Added ownership and existence checks for SRS/Topic Study result creation.
- **Button Semantics**: Added explicit `type="button"` to modal footer buttons.
- **Streak Card**: Corrected study activity bar coloring for visual consistency.

## [1.2.0] - 2025-12-11

### Added

- **Theming System**: Comprehensive engine with semantic variables and dynamic `ThemePalette` switcher.
- **New Themes**: Implemented "Blossom" (sakura particles), "Swiss", "Brutalist", "Retro (Dark)", "Mint", and "Riso".
- **Visual Effects**: Integrated `framer-motion` for page transitions and `tsparticles` for background effects.
- **UI Components**: Global sync status indicator, chart loading skeletons, and accessible loading spinners.
- **Accessibility**: Enhanced focus management (Escape to close menu) and semantic HTML structure.

### Changed

- **Auth Flow**: Centralized redirection logic (`useAuthRedirect`) with improved loading states.
- **Logging**: Unified logging via `logger` utility; silenced noisy network warnings during slow syncs.
- **Quiz Submission**: Batch-processed result saving to prevent concurrency issues; improved error handling.

### Fixed

- **Sync**: Resolved auth failure edge cases and negative submission time bugs.
- **Styling**: Fixed persistent dark mode overrides and specific theme rendering glitches.
- **Tests**: Expanded unit/hook test coverage for auth, sync, and grading logic.

## [1.1.0] - 2025-11-28

### Added

- **Architecture**: New `useQuizSubmission` hook to separate submission logic from UI components.
- **Security**: Enhanced Supabase client to fail safely in development if environment variables are missing.
- **Validation**: Added Zod schemas for robust quiz data validation.

### Changed

- **Performance**: Optimized `ZenQuizContainer` to prevent unnecessary re-renders on timer ticks.
- **Code Quality**: Fixed timezone handling in streak calculations to use local time instead of UTC.
- **Documentation**: Updated tech stack documentation to reflect Next.js 16 and React 19.

### Fixed

- **Sync**: Fixed critical infinite loop bug in `syncManager` when processing invalid records.
- **CSP**: Corrected `frame-ancestors` directive in `proxy.ts`.

## [1.0.4] - 2025-11-20

### Added

- Initial project structure.
- Basic quiz functionality (Zen and Proctor modes).
- Offline-first architecture using Dexie.js.
- Supabase Authentication integration.
