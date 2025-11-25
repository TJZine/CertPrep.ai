# CertPrep.ai Internal APIs

This project runs fully client-side and does not expose a remote API. Data is stored locally in IndexedDB via Dexie.

Key modules:

- `src/db/quizzes.ts` – CRUD for quizzes
- `src/db/results.ts` – result creation and analytics helpers
- `src/hooks/useDatabase.ts` – React hooks for live queries

Security note: No secrets or network calls are required. All user data stays on the device.
