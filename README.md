# CertPrep.ai

CertPrep.ai is a privacy-first web application for simulating professional certification exams. Study offline, track your progress, and use AI-assisted learning to improve faster.

## Features

- Two modes: Zen study (immediate feedback) and Proctor exam (timed, no hints)
- Analytics with score trends, topic radar, and weak-area detection
- AI tutor prompts for missed questions and personalized study plans
- Smart Round focused practice on missed or flagged questions
- Offline-first experience with local IndexedDB storage
- Data export/import and full reset controls
- Installable PWA for mobile and desktop

## Getting Started

Prerequisites: Node.js 18+ and npm.

```bash
git clone https://github.com/yourusername/certprep-ai.git
cd certprep-ai
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Building for Production

```bash
npm run build
npm start
# or export static assets
npm run export
```

## Quiz Format

Quizzes use JSON. Example:

```json
{
  "title": "Sample Certification Quiz",
  "description": "Short description",
  "questions": [
    {
      "id": "q1",
      "category": "Networking",
      "difficulty": "Medium",
      "question": "What does IaaS stand for?",
      "options": { "A": "Option A", "B": "Option B" },
      "correct_answer": "B",
      "explanation": "Explanation here."
    }
  ],
  "tags": ["Sample", "Networking"]
}
```

See `docs/SAMPLE_QUIZ.json` for a full example and field descriptions.

## Tech Stack

- Next.js (App Router), TypeScript (strict), Tailwind CSS
- Zustand for state, Dexie (IndexedDB) for storage
- Recharts for analytics, Lucide for icons, Zod for validation
- DOMPurify for sanitization

## Configuration

Set app name/version and timers in `src/lib/constants.ts`. No external environment variables are required.

## Progressive Web App

- Installable on mobile and desktop
- Offline caching via service worker
- Update notifications when new versions are available

## Testing

```bash
npm run lint
npm run build
```

See `docs/TESTING_CHECKLIST.md` for manual test steps.

## Contributing

Contributions are welcome. Review `docs/CONTRIBUTING.md` for guidelines.

## License

MIT
