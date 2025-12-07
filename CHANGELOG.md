# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
