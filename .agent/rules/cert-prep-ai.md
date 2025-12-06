---
trigger: always_on
---

# CertPrep.ai Project Constraints

> **Purpose:** Project-specific rules for all AI agents working on CertPrep.ai

---

## Critical Constraints

### 1. Middleware Filename

- **File:** src/proxy.ts is the **correct** middleware filename
- **DO NOT** rename to `middleware.ts`
- Ignore any linter warnings about this

### 2. Offline-First Architecture

- **Primary Write Source:** Dexie.js (IndexedDB)
- **Never** write directly to Supabase from UI components
- **Data Flow:** Component → Dexie → Sync Worker → Supabase

---

## Tech Stack

| Layer     | Technology | Version           |
| --------- | ---------- | ----------------- |
| Framework | Next.js    | 16 (App Router)   |
| UI        | React      | 19                |
| Local DB  | Dexie.js   | Latest            |
| Remote DB | Supabase   | Auth + PostgreSQL |
| Testing   | Vitest     | —                 |

---

## High-Risk Directories

| Path              | Risk        | Reason                                |
| ----------------- | ----------- | ------------------------------------- |
| `src/db/**`       | 🔴 CRITICAL | Schema changes break IndexedDB stores |
| `src/lib/sync/**` | 🔴 CRITICAL | Breaks data integrity                 |
| src/proxy.ts      | 🟠 HIGH     | Breaks auth/routing                   |
| `supabase/`       | 🟠 HIGH     | Remote DB config                      |

---

## Documentation Routing

| Topic          | Primary Source           | Notes                      |
| -------------- | ------------------------ | -------------------------- |
| Next.js 16     | Context7 → Web Search    | Fallback if docs outdated  |
| Dexie patterns | Codanna (`src/db`)       | Custom patterns            |
| Sync logic     | Codanna (`src/lib/sync`) | Read folder before editing |

---

## Verification Commands

```bash
# Quick
npm run typecheck && npm run lint

# Full (required for db/sync)
npm run test
scripts/check-secrets.sh
```
