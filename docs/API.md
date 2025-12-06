# API Reference

> Complete API documentation for CertPrep.ai

---

## Table of Contents

- [Authentication](#authentication)
- [Quizzes](#quizzes)
- [Results](#results)
- [Rate Limits](#rate-limits)
- [User Settings](#user-settings)
- [Error Handling](#error-handling)

---

## Authentication

### Sign Up

Creates a new user account.

```typescript
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securepassword123",
});
```

<details>
<summary>Response</summary>

```typescript
// Success
{
  data: {
    user: {
      id: 'uuid',
      email: 'user@example.com',
      created_at: '2024-01-01T00:00:00Z'
    },
    session: {
      access_token: 'jwt-token',
      refresh_token: 'refresh-token',
      expires_in: 3600
    }
  },
  error: null
}

// Error
{
  data: { user: null, session: null },
  error: {
    message: 'User already registered',
    status: 400
  }
}
```

</details>

---

### Sign In

Authenticates an existing user.

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "securepassword123",
});
```

| Parameter  | Type     | Required | Description          |
| ---------- | -------- | -------- | -------------------- |
| `email`    | `string` | ✅       | User's email address |
| `password` | `string` | ✅       | User's password      |

---

### Sign Out

Ends the current session.

```typescript
const { error } = await supabase.auth.signOut();
```

---

### Get Current User

Retrieves the current authenticated user.

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
```

---

## Quizzes

### Types

> These types mirror the core fields used in `src/types/quiz.ts` but omit some internal metadata for brevity.

```typescript
interface Question {
  id: string;
  category: string;
  question: string;
  options: Record<string, string>;
  explanation: string;
}

interface Quiz {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: number;
  updated_at?: number;
  questions: Question[];
  tags: string[];
  version: number;
}
```

### List Quizzes

Retrieves quizzes from the local Dexie database. All queries are automatically scoped to the current authenticated user.

```typescript
import { getAllQuizzes, searchQuizzes } from "@/db/quizzes";

// All quizzes for the current user
const quizzes = await getAllQuizzes();

// Search by title or tags
const filtered = await searchQuizzes("aws");
```

### Get Quiz by ID

```typescript
import { getQuizById } from "@/db/quizzes";

const quiz = await getQuizById(quizId);
```

| Parameter | Type     | Required | Description     |
| --------- | -------- | -------- | --------------- |
| `quizId`  | `string` | ✅       | Quiz identifier |

---

## Results

### Types

> See `src/types/result.ts` for the full definition used in the app.

```typescript
type SyncFlag = 0 | 1;

interface Result {
  id: string;
  quiz_id: string;
  user_id: string;
  timestamp: number;
  mode: "zen" | "proctor";
  score: number;
  time_taken_seconds: number;
  answers: Record<string, string>;
  flagged_questions: string[];
  category_breakdown: Record<string, number>;
  synced?: SyncFlag; // 0 = not synced, 1 = synced
}
```

### Create Result

Saves a quiz result locally; it will be synchronized to Supabase in the background.

```typescript
import { createResult } from "@/db/results";
import type { QuizMode } from "@/types/quiz";

const result = await createResult({
  quizId: "quiz-uuid",
  mode: "proctor" satisfies QuizMode,
  answers: {
    "question-id-1": "A",
    "question-id-2": "C",
  },
  flaggedQuestions: [],
  timeTakenSeconds: 1200,
  userId: "user-uuid",
});
```

> [!NOTE]
> Results are saved with `synced: 0` and will be synchronized to Supabase in the background.

---

### Get Results

```typescript
import { db } from "@/db";

// All results
const results = await db.results.toArray();

// Results for specific quiz
const quizResults = await db.results.where("quiz_id").equals(quizId).toArray();

// Results sorted by timestamp
const recentResults = await db.results
  .orderBy("timestamp")
  .reverse()
  .limit(10)
  .toArray();
```

---

### Sync Results

Manually triggers result synchronization.

```typescript
import { syncResults } from "@/lib/sync/syncManager";

await syncResults(userId);
```

---

## User Settings

### Types

> Note: The core application does not currently include a `user_settings` feature.  
> This section describes a **pattern you can adopt** if you choose to add such a table to your own Supabase project.

```typescript
interface UserSettings {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "system";
  notifications_enabled: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}
```

### Get Settings

```typescript
const { data, error } = await supabase
  .from("user_settings")
  .select("*")
  .eq("user_id", userId)
  .single();
```

### Update Settings

```typescript
const { data, error } = await supabase
  .from("user_settings")
  .update({
    theme: "dark",
    notifications_enabled: true,
  })
  .eq("user_id", userId);
```

---

## Error Handling

### Error Types

```typescript
interface AppError {
  code: string;
  message: string;
  details?: unknown;
}
```

### Common Error Codes

| Code                       | Description               | HTTP Status |
| -------------------------- | ------------------------- | ----------- |
| `auth/invalid-credentials` | Invalid email or password | 401         |
| `auth/user-not-found`      | No user with this email   | 404         |
| `auth/session-expired`     | Session has expired       | 401         |
| `db/not-found`             | Resource not found        | 404         |
| `db/permission-denied`     | RLS policy violation      | 403         |
| `sync/failed`              | Sync operation failed     | 500         |
| `validation/invalid-input` | Invalid input data        | 400         |

### Error Handling Example

```typescript
import { AuthError, DatabaseError } from "@supabase/supabase-js";

try {
  const result = await createResult(data);
} catch (error) {
  if (error instanceof AuthError) {
    // Handle auth error
    toast.error("Please sign in to save results");
  } else if (error instanceof DatabaseError) {
    // Handle database error
    toast.error("Failed to save result");
  } else {
    // Handle unknown error
    toast.error("An unexpected error occurred");
    console.error(error);
  }
}
```

---

## Rate Limits

| Endpoint        | Limit         | Window   |
| --------------- | ------------- | -------- |
| Auth (signup)   | 30 requests   | 1 hour   |
| Auth (signin)   | 30 requests   | 1 hour   |
| Database reads  | 1000 requests | 1 minute |
| Database writes | 100 requests  | 1 minute |

> [!NOTE]
> These limits are illustrative only and depend on your specific Supabase plan.
> [!WARNING]
> Exceeding rate limits will result in temporary blocking.
