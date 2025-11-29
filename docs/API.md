# API Reference

> Complete API documentation for CertPrep.ai

---

## Table of Contents

- [Authentication](#authentication)
- [Quizzes](#quizzes)
- [Results](#results)
- [User Settings](#user-settings)
- [Error Handling](#error-handling)

---

## Authentication

### Sign Up

Creates a new user account.

```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
})
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
  email: 'user@example.com',
  password: 'securepassword123'
})
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | `string` | ✅ | User's email address |
| `password` | `string` | ✅ | User's password |

---

### Sign Out

Ends the current session.

```typescript
const { error } = await supabase.auth.signOut()
```

---

### Get Current User

Retrieves the current authenticated user.

```typescript
const { data: { user }, error } = await supabase.auth.getUser()
```

---

## Quizzes

### Types

```typescript
interface Quiz {
  id: string
  title: string
  description: string
  mode: 'proctor' | 'zen'
  questions: Question[]
  duration?: number // seconds, for proctor mode
  created_at: string
  updated_at: string
}

interface Question {
  id: string
  text: string
  options: Option[]
  correct_answer: string
}

interface Option {
  id: string
  text: string
}
```

### List Quizzes

Retrieves all available quizzes.

```typescript
import { db } from '@/db'

// Local query
const quizzes = await db.quizzes.toArray()

// With filtering
const proctorQuizzes = await db.quizzes
  .where('mode')
  .equals('proctor')
  .toArray()
```

---

### Get Quiz by ID

```typescript
const quiz = await db.quizzes.get(quizId)
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `quizId` | `string` | ✅ | Quiz UUID |

---

## Results

### Types

```typescript
interface Result {
  id: string
  quiz_id: string
  user_id: string
  score: number
  total_questions: number
  correct_answers: number
  mode: 'proctor' | 'zen'
  duration: number // seconds
  timestamp: string
  synced: 0 | 1
  answers: AnswerRecord[]
}

interface AnswerRecord {
  question_id: string
  selected_option: string
  correct: boolean
  time_spent: number
}
```

### Create Result

Saves a quiz result locally.

```typescript
import { saveResult } from '@/db/results'

const result = await saveResult({
  quiz_id: 'quiz-uuid',
  user_id: 'user-uuid',
  score: 85,
  total_questions: 20,
  correct_answers: 17,
  mode: 'proctor',
  duration: 1200,
  answers: [...]
})
```

> [!NOTE]
> Results are saved with `synced: 0` and will be synchronized to Supabase in the background.

---

### Get Results

```typescript
import { db } from '@/db'

// All results
const results = await db.results.toArray()

// Results for specific quiz
const quizResults = await db.results
  .where('quiz_id')
  .equals(quizId)
  .toArray()

// Results sorted by timestamp
const recentResults = await db.results
  .orderBy('timestamp')
  .reverse()
  .limit(10)
  .toArray()
```

---

### Sync Results

Manually triggers result synchronization.

```typescript
import { syncResults } from '@/lib/sync/syncManager'

await syncResults(userId)
```

---

## User Settings

### Types

```typescript
interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  sound_enabled: boolean
  created_at: string
  updated_at: string
}
```

### Get Settings

```typescript
const { data, error } = await supabase
  .from('user_settings')
  .select('*')
  .eq('user_id', userId)
  .single()
```

### Update Settings

```typescript
const { data, error } = await supabase
  .from('user_settings')
  .update({
    theme: 'dark',
    notifications_enabled: true
  })
  .eq('user_id', userId)
```

---

## Error Handling

### Error Types

```typescript
interface AppError {
  code: string
  message: string
  details?: unknown
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `auth/invalid-credentials` | Invalid email or password | 401 |
| `auth/user-not-found` | No user with this email | 404 |
| `auth/session-expired` | Session has expired | 401 |
| `db/not-found` | Resource not found | 404 |
| `db/permission-denied` | RLS policy violation | 403 |
| `sync/failed` | Sync operation failed | 500 |
| `validation/invalid-input` | Invalid input data | 400 |

### Error Handling Example

```typescript
try {
  const result = await saveResult(data)
} catch (error) {
  if (error instanceof AuthError) {
    // Handle auth error
    toast.error('Please sign in to save results')
  } else if (error instanceof DatabaseError) {
    // Handle database error
    toast.error('Failed to save result')
  } else {
    // Handle unknown error
    toast.error('An unexpected error occurred')
    console.error(error)
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth (signup) | 30 requests | 1 hour |
| Auth (signin) | 30 requests | 1 hour |
| Database reads | 1000 requests | 1 minute |
| Database writes | 100 requests | 1 minute |

> [!WARNING]
> Exceeding rate limits will result in temporary blocking.
