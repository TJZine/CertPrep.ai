import { db } from '@/db';
import { sanitizeQuestions } from '@/db/quizzes';
import { sanitizeQuestionText } from '@/lib/sanitize';
import { QUIZ_MODES, type Quiz } from '@/types/quiz';
import type { Result } from '@/types/result';
import { QuizSchema } from '@/validators/quizSchema';
import { z } from 'zod';

export interface ExportData {
  version: string;
  exportedAt: string;
  quizzes: Quiz[];
  results: Result[];
}

const ResultImportSchema = z.object({
  id: z.string().uuid(),
  quiz_id: z.string().uuid(),
  timestamp: z.number().int().nonnegative(),
  mode: z.enum(QUIZ_MODES),
  score: z.number().min(0).max(100),
  time_taken_seconds: z.number().nonnegative(),
  answers: z.record(z.string(), z.string()).default({}),
  flagged_questions: z.array(z.string()).default([]),
  category_breakdown: z.record(z.string(), z.number()).default({}),
});

const QuizBackupSchema = QuizSchema.extend({
  sourceId: z.string().optional(),
  deleted_at: z.number().nullable().optional(),
  updated_at: z.number().nullable().optional(),
  quiz_hash: z.string().nullable().optional(),
});

function sanitizeQuizRecord(quiz: unknown, userId: string): Quiz | null {
  const parsed = QuizBackupSchema.safeParse(quiz);

  if (!parsed.success) {
    const maybeQuiz = quiz as { id?: string };
    console.error('Skipped invalid quiz during import:', maybeQuiz.id, parsed.error);
    return null;
  }

  const createdAt = parsed.data.created_at ?? Date.now();
  const updatedAt = parsed.data.updated_at ?? createdAt;
  const deletedAt = parsed.data.deleted_at ?? null;
  const quizHash = parsed.data.quiz_hash ?? null;

  return {
    ...parsed.data,
    user_id: userId,
    title: sanitizeQuestionText(parsed.data.title),
    description: sanitizeQuestionText(parsed.data.description ?? ''),
    tags: (parsed.data.tags ?? []).map((tag) => sanitizeQuestionText(tag)),
    questions: sanitizeQuestions(parsed.data.questions),
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    quiz_hash: quizHash,
    last_synced_at: null,
    last_synced_version: null,
  };
}

function sanitizeResultRecord(result: unknown, userId: string): Result | null {
  const parsed = ResultImportSchema.safeParse(result);

  if (!parsed.success) {
    const maybeResult = result as { id?: string };
    console.error('Skipped invalid result during import:', maybeResult.id, parsed.error);
    return null;
  }

  const sanitizedCategoryBreakdown: Record<string, number> = {};
  for (const [key, value] of Object.entries(parsed.data.category_breakdown)) {
    sanitizedCategoryBreakdown[sanitizeQuestionText(key)] = value;
  }

  return {
    ...parsed.data,
    user_id: userId,
    synced: 0,
    category_breakdown: sanitizedCategoryBreakdown,
  };
}

/**
 * Generator that streams the export JSON in chunks.
 * This prevents Out-Of-Memory errors for large datasets.
 */
export async function* generateJSONExport(userId: string): AsyncGenerator<string> {
  yield `{\n  "version": "1.0",\n  "exportedAt": "${new Date().toISOString()}",\n  "quizzes": [`;

  let offset = 0;
  const BATCH_SIZE = 100;
  
  while (true) {
    const batch = await db.quizzes.where('user_id').equals(userId).offset(offset).limit(BATCH_SIZE).toArray();
    if (batch.length === 0) break;
    
    for (let i = 0; i < batch.length; i++) {
      const quiz = batch[i];
      if (!quiz) continue;
      if (offset > 0 || i > 0) yield ',';
      const { user_id: _omitUserId, ...rest } = quiz;
      void _omitUserId;
      yield JSON.stringify(rest);
    }
    offset += batch.length;
  }
  
  yield `],\n  "results": [`;
  
  offset = 0;
  while (true) {
    const batch = await db.results.where('user_id').equals(userId).offset(offset).limit(BATCH_SIZE).toArray();
    if (batch.length === 0) break;
    
    for (let i = 0; i < batch.length; i++) {
      if (offset > 0 || i > 0) yield ',';
      const result = batch[i];
      if (!result) continue;
      const { user_id: _omitUserId, ...rest } = result;
      void _omitUserId;
      yield JSON.stringify(rest);
    }
    offset += batch.length;
  }
  
  yield `]\n}`;
}

/**
 * Download data as a JSON file using streaming to minimize memory usage.
 */
export async function downloadDataAsFile(userId: string): Promise<void> {
  const parts: string[] = [];
  
  // Consume the generator
  for await (const chunk of generateJSONExport(userId)) {
    parts.push(chunk);
  }
  
  const blob = new Blob(parts, { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `certprep-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported data structure.
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'string') return false;
  if (!Array.isArray(obj.quizzes)) return false;
  if (!Array.isArray(obj.results)) return false;

  // Basic shape checks; full validation/sanitization occurs per quiz in importData.
  return true;
}

/**
 * Import data from a backup file.
 */
export async function importData(
  data: ExportData,
  userId: string,
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ quizzesImported: number; resultsImported: number }> {
  const sanitizedQuizzes: Quiz[] = [];
  const quizIds = new Set<string>();

  for (const quiz of data.quizzes) {
    const sanitizedQuiz = sanitizeQuizRecord(quiz, userId);
    if (!sanitizedQuiz) continue;
    if (quizIds.has(sanitizedQuiz.id)) {
      console.warn('Skipped duplicate quiz id during import:', sanitizedQuiz.id);
      continue;
    }
    sanitizedQuizzes.push(sanitizedQuiz);
    quizIds.add(sanitizedQuiz.id);
  }

  const existingQuizIds =
    mode === 'merge'
      ? new Set<string>((await db.quizzes.where('user_id').equals(userId).toArray()).map((quiz) => quiz.id))
      : new Set<string>();
  const allowedQuizIds = new Set<string>([...quizIds, ...existingQuizIds]);

  const sanitizedResults: Result[] = [];
  const resultIds = new Set<string>();

  for (const result of data.results) {
    const sanitizedResult = sanitizeResultRecord(result, userId);
    if (!sanitizedResult) continue;
    if (!allowedQuizIds.has(sanitizedResult.quiz_id)) {
      console.warn('Skipped result referencing missing quiz during import:', sanitizedResult.id);
      continue;
    }
    if (resultIds.has(sanitizedResult.id)) {
      console.warn('Skipped duplicate result id during import:', sanitizedResult.id);
      continue;
    }
    sanitizedResults.push(sanitizedResult);
    resultIds.add(sanitizedResult.id);
  }

  let quizzesImported = 0;
  let resultsImported = 0;

  if (mode === 'replace') {
    if (sanitizedQuizzes.length === 0 && sanitizedResults.length === 0) {
      throw new Error('Import aborted: no valid quizzes or results to import.');
    }

    await db.transaction('rw', db.quizzes, db.results, db.syncState, async () => {
      await Promise.all([
        db.quizzes.where('user_id').equals(userId).delete(),
        db.results.where('user_id').equals(userId).delete(),
        db.syncState.delete(`results:${userId}`),
        db.syncState.delete(`quizzes:${userId}`),
        db.syncState.delete(`quizzes:backfill:${userId}`),
      ]);
      if (sanitizedQuizzes.length > 0) {
        await db.quizzes.bulkPut(sanitizedQuizzes);
        quizzesImported = sanitizedQuizzes.length;
      }

      if (sanitizedResults.length > 0) {
        await db.results.bulkPut(sanitizedResults);
        resultsImported = sanitizedResults.length;
      }
    });

    return { quizzesImported, resultsImported };
  }

  await db.transaction('rw', db.quizzes, db.results, async () => {
    const quizzesInDb = await db.quizzes.where('user_id').equals(userId).toArray();
    const mergedExistingQuizIds = new Set<string>(quizzesInDb.map((quiz) => quiz.id));
    const quizzesToAdd = sanitizedQuizzes.filter((quiz) => !mergedExistingQuizIds.has(quiz.id));

    if (quizzesToAdd.length > 0) {
      await db.quizzes.bulkPut(quizzesToAdd);
      quizzesImported = quizzesToAdd.length;
      quizzesToAdd.forEach((quiz) => mergedExistingQuizIds.add(quiz.id));
    }

    const resultsInDb = await db.results.where('user_id').equals(userId).toArray();
    const mergedExistingResultIds = new Set<string>(resultsInDb.map((result) => result.id));
    const resultsToAdd = sanitizedResults.filter(
      (result) => mergedExistingQuizIds.has(result.quiz_id) && !mergedExistingResultIds.has(result.id),
    );

    if (resultsToAdd.length > 0) {
      await db.results.bulkPut(resultsToAdd);
      resultsImported = resultsToAdd.length;
    }
  });

  return { quizzesImported, resultsImported };
}

/**
 * Clear all data (factory reset).
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.quizzes, db.results, db.syncState, async () => {
    await Promise.all([db.quizzes.clear(), db.results.clear(), db.syncState.clear()]);
  });
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Get storage usage statistics.
 */
export async function getStorageStats(userId: string | null | undefined): Promise<{
  quizCount: number;
  resultCount: number;
  estimatedSizeKB: number;
}> {
  if (!userId) {
    return { quizCount: 0, resultCount: 0, estimatedSizeKB: 0 };
  }

  // Optimized: Use count() instead of toArray() to avoid loading all data
  const quizCount = await db.quizzes.where('user_id').equals(userId).count();
  const resultCount = await db.results.where('user_id').equals(userId).count();
  
  // Estimation: ~2KB per quiz (with questions), ~1KB per result
  // This is faster and uses O(1) memory compared to JSON.stringify(allData)
  const estimatedBytes = quizCount * 2 * 1024 + resultCount * 1024;
  const estimatedSizeKB = Math.round(estimatedBytes / 1024);

  return {
    quizCount,
    resultCount,
    estimatedSizeKB,
  };
}
