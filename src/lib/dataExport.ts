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
  id: z.string(),
  quiz_id: z.string(),
  timestamp: z.number().int().nonnegative(),
  mode: z.enum(QUIZ_MODES),
  score: z.number(),
  time_taken_seconds: z.number().nonnegative(),
  answers: z.record(z.string(), z.string()).default({}),
  flagged_questions: z.array(z.string()).default([]),
  category_breakdown: z.record(z.string(), z.number()).default({}),
});

const QuizBackupSchema = QuizSchema.extend({
  sourceId: z.string().optional(),
});

function sanitizeQuizRecord(quiz: unknown): Quiz | null {
  const parsed = QuizBackupSchema.safeParse(quiz);

  if (!parsed.success) {
    const maybeQuiz = quiz as { id?: string };
    console.error('Skipped invalid quiz during import:', maybeQuiz.id, parsed.error);
    return null;
  }

  return {
    ...parsed.data,
    title: sanitizeQuestionText(parsed.data.title),
    description: sanitizeQuestionText(parsed.data.description ?? ''),
    tags: (parsed.data.tags ?? []).map((tag) => sanitizeQuestionText(tag)),
    questions: sanitizeQuestions(parsed.data.questions),
  };
}

function sanitizeResultRecord(result: unknown): Result | null {
  const parsed = ResultImportSchema.safeParse(result);

  if (!parsed.success) {
    const maybeResult = result as { id?: string };
    console.error('Skipped invalid result during import:', maybeResult.id, parsed.error);
    return null;
  }

  return parsed.data;
}

/**
 * Export all user data as JSON.
 */
export async function exportAllData(): Promise<ExportData> {
  const quizzes = await db.quizzes.toArray();
  const results = await db.results.toArray();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    quizzes,
    results,
  };
}

/**
 * Download data as a JSON file.
 */
export async function downloadDataAsFile(): Promise<void> {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
  mode: 'merge' | 'replace' = 'merge',
): Promise<{ quizzesImported: number; resultsImported: number }> {
  const sanitizedQuizzes: Quiz[] = [];
  const quizIds = new Set<string>();

  for (const quiz of data.quizzes) {
    const sanitizedQuiz = sanitizeQuizRecord(quiz);
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
      ? new Set<string>((await db.quizzes.toArray()).map((quiz) => quiz.id))
      : new Set<string>();
  const allowedQuizIds = new Set<string>([...quizIds, ...existingQuizIds]);

  const sanitizedResults: Result[] = [];
  const resultIds = new Set<string>();

  for (const result of data.results) {
    const sanitizedResult = sanitizeResultRecord(result);
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

    await db.transaction('rw', db.quizzes, db.results, async () => {
      await Promise.all([db.quizzes.clear(), db.results.clear()]);
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
    const quizzesInDb = await db.quizzes.toArray();
    const mergedExistingQuizIds = new Set<string>(quizzesInDb.map((quiz) => quiz.id));
    const quizzesToAdd = sanitizedQuizzes.filter((quiz) => !mergedExistingQuizIds.has(quiz.id));

    if (quizzesToAdd.length > 0) {
      await db.quizzes.bulkPut(quizzesToAdd);
      quizzesImported = quizzesToAdd.length;
      quizzesToAdd.forEach((quiz) => mergedExistingQuizIds.add(quiz.id));
    }

    const resultsInDb = await db.results.toArray();
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
  await db.transaction('rw', db.quizzes, db.results, async () => {
    await Promise.all([db.quizzes.clear(), db.results.clear()]);
  });
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Get storage usage statistics.
 */
export async function getStorageStats(): Promise<{
  quizCount: number;
  resultCount: number;
  estimatedSizeKB: number;
}> {
  const quizzes = await db.quizzes.toArray();
  const results = await db.results.toArray();
  const quizzesJson = JSON.stringify(quizzes);
  const resultsJson = JSON.stringify(results);
  const estimatedSizeKB = Math.round((quizzesJson.length + resultsJson.length) / 1024);

  return {
    quizCount: quizzes.length,
    resultCount: results.length,
    estimatedSizeKB,
  };
}
