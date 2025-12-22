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

---

## What is Interleaved Practice?

Interleaved Practice mixes questions from multiple quizzes for varied study:

1. Go to the **Dashboard**
2. Click the **Interleaved Practice** card
3. Configure question count and optional category filters
4. Start a session with questions sampled across all your quizzes

This technique improves long-term retention by forcing your brain to switch between topics, strengthening recall pathways.

---

## How do I create custom quizzes?

CertPrep.ai provides AI-powered tools to generate practice quizzes:

1. Visit the [Create page](/create) for step-by-step guidance
2. Use our **Gemini Gem** or **ChatGPT GPT** to generate quiz JSON
3. Copy the output and import it via **Dashboard → Import Quiz**

The AI tools support multiple approaches:

- Generate questions from study notes or PDFs
- Match the style of existing exam questions
- Create variations of existing questions for more practice

See [AI Quiz Generators](/docs/ai-quiz-generators/README.md) for detailed prompts and customization.

---

## How do I align categories with my certification exam?

The **Create page** includes an **Exam Alignment** section to help you:

1. Visit the [Create page](/create)
2. Expand "🎯 Align with Your Exam"
3. Select your certification (AWS SAA, CompTIA Security+, PMP, CISSP, etc.)
4. Copy the generated prompt modifier into your AI tool

Using official exam domains as categories improves your Topic Heatmap analytics, making it easier to identify weak areas that match your actual test blueprint.

---

## What is Quiz Remix (Shuffle)?

Quiz Remix randomizes question and answer order for a fresh experience:

1. Select a quiz and click **Start Quiz**
2. Enable **Shuffle** in the quiz lobby
3. Questions and answer options appear in random order

Your answers are still tracked correctly against the original quiz for accurate analytics — only the presentation changes.
