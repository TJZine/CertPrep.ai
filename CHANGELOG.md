# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
