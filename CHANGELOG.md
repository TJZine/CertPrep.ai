# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Nothing yet

### Fixed
- Nothing yet

---

## [2.1.0] - 2024-01-15

### Added
- ✨ Dark mode support across all components
- 📊 New analytics dashboard with performance charts
- 🔔 Toast notification system for user feedback
- ⌨️ Keyboard shortcuts for quiz navigation

### Changed
- ⚡ Improved sync performance by 40%
- 🎨 Updated button styles for better accessibility
- 📱 Enhanced mobile navigation experience

### Fixed
- 🐛 Fixed quiz timer not pausing on tab switch
- 🐛 Resolved auth state persistence issue after refresh
- 🐛 Fixed modal focus trap on mobile devices

### Security
- 🔒 Added CSRF protection to auth endpoints
- 🔒 Improved session validation in middleware

---

## [2.0.0] - 2024-01-01

### ⚠️ Breaking Changes
- Migrated to Next.js App Router (pages/ → app/)
- Changed auth provider from custom to Supabase Auth
- Updated Result type schema (migration required)

### Added
- 🚀 Complete rewrite with Next.js 14 App Router
- 🔐 Supabase Authentication integration
- 💾 Offline-first with IndexedDB (Dexie)
- 🔄 Automatic background sync

### Changed
- 📦 Updated all dependencies to latest versions
- 🏗️ New project structure following Next.js conventions

### Migration Guide

<details>
<summary>Click to expand migration steps</summary>

1. **Update environment variables:**
   ```env
   # Old
   DATABASE_URL=...
   
   # New
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

2. **Run database migrations:**
   ```bash
   npx supabase db push
   ```

3. **Clear local storage:**
   Users will need to re-authenticate after update.

</details>

---

## [1.5.0] - 2023-12-01

### Added
- Zen mode for relaxed practice sessions
- Results export to CSV

### Fixed
- Score calculation rounding errors
- Mobile viewport issues on iOS Safari

---

## [1.4.0] - 2023-11-15

### Added
- Proctor mode with strict timing
- User settings page

### Changed
- Improved error messages

---

## [1.0.0] - 2023-10-01

### Added
- 🎉 Initial release
- Basic quiz functionality
- User authentication
- Results tracking

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 2.1.0 | 2024-01-15 | Dark mode, analytics |
| 2.0.0 | 2024-01-01 | Next.js 14, Supabase |
| 1.5.0 | 2023-12-01 | Zen mode |
| 1.4.0 | 2023-11-15 | Proctor mode |
| 1.0.0 | 2023-10-01 | Initial release |

---

[Unreleased]: https://github.com/TJZine/CertPrep.ai/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/TJZine/CertPrep.ai/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/TJZine/CertPrep.ai/compare/v1.5.0...v2.0.0
[1.5.0]: https://github.com/TJZine/CertPrep.ai/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/TJZine/CertPrep.ai/compare/v1.0.0...v1.4.0
[1.0.0]: https://github.com/TJZine/CertPrep.ai/releases/tag/v1.0.0
