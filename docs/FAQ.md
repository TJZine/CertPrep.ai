# FAQ

This FAQ covers common questions when running or extending CertPrep.ai yourself.

---

## Is my data stored locally or in the cloud?

CertPrep.ai is **offline‑first**:

- Quizzes and results are stored locally in your browser using IndexedDB (via Dexie).
- Results (and, if configured, quizzes) are synchronized to your Supabase project for backup and cross‑device access.

On shared or public devices, use **Settings → Data Management → Reset** to clear local data.

---

## What do I need to self‑host this project?

At a minimum:

- Node.js 18+ and npm.
- A Supabase project with:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Tables and RLS policies as described in [docs/ARCHITECTURE.md](./ARCHITECTURE.md#supabase-database-schema).

Then:

```bash
cp .env.example .env.local
npm install
npm run dev
```

---

## Does it work offline?

Yes. Quizzes and results are stored in Dexie/IndexedDB:

- You can take quizzes and review results while offline.
- When connectivity returns, the sync managers (`syncResults`, `syncQuizzes`) push local changes to Supabase and pull any remote updates.

---

## How do I reset my data or start fresh?

For your **local browser**:

- Use the in‑app **Data Management** UI (under Settings) to clear local quizzes and results; or,
- As a developer, call `clearDatabase()` from `src/db/index.ts` in a controlled context (e.g., debug button).

For your **Supabase data**:

- Use the Supabase dashboard or SQL console to delete or truncate rows from `results`/`quizzes` for your user.
- Be careful to preserve RLS policies and not affect other users in a multi‑tenant environment.

---

## Where should I look if something goes wrong with sync?

- Client‑side logs: `src/lib/logger.ts` integrates with Sentry in production.
- Result sync: `src/lib/sync/syncManager.ts`.
- Quiz sync: `src/lib/sync/quizSyncManager.ts`.

Check your browser console (in development) and Supabase logs for detailed errors.
