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
- SRS sync: `src/lib/sync/srsSyncManager.ts`.

Check your browser console (in development) and Supabase logs for detailed errors.

---

## How does the Spaced Repetition System (SRS) work?

CertPrep.ai uses a **Leitner box algorithm** for optimized review scheduling:

- Questions move through 5 boxes based on correct/incorrect answers.
- Box 1 (new/forgotten) reviews daily; Box 5 (mastered) reviews every 14 days.
- SRS state is stored locally and synced cross-device via Supabase.
- Access your review queue at `/study-due`.

For details, see the `srs` table schema in [ARCHITECTURE.md](./ARCHITECTURE.md#srs).

---

## How do I categorize quizzes for analytics?

Add `category` and `subcategory` fields to your quiz JSON:

```json
{
  "title": "Insurance Exam",
  "category": "Insurance",
  "subcategory": "MA Personal Lines",
  "questions": [...]
}
```

These fields enable the **Topic Heatmap** on the Analytics page, grouping performance by category. Quizzes without categories will show a warning indicator.

---

## What is Comfort Mode?

**Settings → Appearance → Reduce visual effects** enables Comfort Mode:

- Disables particle animations (Blossom, Midnight, Vapor themes)
- Reduces motion for users sensitive to animations
- May improve battery life on mobile devices

---

## What is Topic Study Mode?

Topic Study lets you practice questions from weak areas:

1. Go to the **Analytics** page
2. Find a category with low performance in the Topic Heatmap
3. Click **Focus here** to start a targeted practice session

Only questions from that category are included, helping you focus on weak areas.
