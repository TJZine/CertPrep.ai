
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { QUIZ_MODES, type QuizMode } from '@/types/quiz';

// Re-defining the schema here to test it in isolation, 
// mirroring src/lib/sync/syncManager.ts to ensure the logic holds.
// Ideally we would export it from syncManager, but it's not exported there.
// We will verify the behavior of z.coerce.number() specifically.

const RemoteResultSchema = z.object({
  id: z.string(),
  quiz_id: z.string(),
  timestamp: z.coerce.number(), // The target of our test
  mode: z.enum([...QUIZ_MODES] as [string, ...string[]]).transform((val) => val as QuizMode),
  score: z.number().min(0).max(100),
  time_taken_seconds: z.number().min(0),
  answers: z.record(z.string(), z.string()),
  flagged_questions: z.array(z.string()),
  category_breakdown: z.record(z.string(), z.number()),
  created_at: z.string(),
});

describe('RemoteResultSchema', () => {
  it('should accept number timestamp', () => {
    const data = {
      id: '1',
      quiz_id: 'q1',
      timestamp: 1620000000000,
      mode: 'zen',
      score: 85,
      time_taken_seconds: 120,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      created_at: '2021-05-03T00:00:00Z',
    };
    const result = RemoteResultSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data.timestamp).toBe(1620000000000);
    }
  });

  it('should coerce string timestamp (Supabase bigint) to number', () => {
    const data = {
      id: '2',
      quiz_id: 'q1',
      timestamp: "1620000000000", // String input
      mode: 'proctor',
      score: 90,
      time_taken_seconds: 100,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      created_at: '2021-05-03T00:00:00Z',
    };
    const result = RemoteResultSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
        expect(result.data.timestamp).toBe(1620000000000);
        expect(typeof result.data.timestamp).toBe('number');
    }
  });

  it('should fail on invalid timestamp string', () => {
    const data = {
      id: '3',
      quiz_id: 'q1',
      timestamp: "not-a-number",
      mode: 'zen',
      score: 85,
      time_taken_seconds: 120,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      created_at: '2021-05-03T00:00:00Z',
    };
    const result = RemoteResultSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
