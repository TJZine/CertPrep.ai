import { db } from "@/db";
import { isSRSQuiz, sanitizeQuestions } from "@/db/quizzes";
import { sanitizeQuestionText } from "@/lib/sanitize";
import { computeQuizHash } from "@/lib/sync/quizDomain";
import { QUIZ_MODES, type Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import { QuizSchema } from "@/validators/quizSchema";
import { requestServiceWorkerCacheClear } from "@/lib/serviceWorkerClient";
import { z } from "zod";

export interface ExportData {
  version: string;
  exportedAt: string;
  quizzes: Quiz[];
  results: Result[];
}

export type ImportMode = "merge" | "replace" | "smart";

export interface ImportResult {
  quizzesImported: number;
  resultsImported: number;
  quizzesMerged?: number;
  resultsDeduplicated?: number;
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
  // Allow user_id to be absent in backups; we inject it from the caller.
  user_id: z.string().optional(),
  deleted_at: z.number().nullable().optional(),
  updated_at: z.number().nullable().optional(),
  quiz_hash: z.string().nullable().optional(),
});

async function sanitizeQuizRecord(
  quiz: unknown,
  userId: string,
): Promise<Quiz | null> {
  const parsed = QuizBackupSchema.safeParse(quiz);

  if (!parsed.success) {
    const maybeQuiz = quiz as { id?: string };
    console.error(
      "Skipped invalid quiz during import:",
      maybeQuiz.id,
      parsed.error,
    );
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
    description: sanitizeQuestionText(parsed.data.description ?? ""),
    tags: (parsed.data.tags ?? []).map((tag) => sanitizeQuestionText(tag)),
    questions: await sanitizeQuestions(parsed.data.questions),
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
    console.error(
      "Skipped invalid result during import:",
      maybeResult.id,
      parsed.error,
    );
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
export async function* generateJSONExport(
  userId: string,
): AsyncGenerator<string> {
  yield `{\n  "version": "1.0",\n  "exportedAt": "${new Date().toISOString()}",\n  "quizzes": [`;

  let offset = 0;
  const BATCH_SIZE = 100;
  let isFirstQuiz = true;

  while (true) {
    const batch = await db.quizzes
      .where("user_id")
      .equals(userId)
      .offset(offset)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) break;

    for (const quiz of batch) {
      if (!quiz) continue;
      if (!isFirstQuiz) yield ",";
      let quizHash = quiz.quiz_hash ?? null;
      if (!quizHash) {
        try {
          quizHash = await computeQuizHash(quiz);
        } catch (error) {
          console.warn(
            "Failed to compute quiz hash during export:",
            quiz.id,
            error,
          );
          quizHash = quiz.id;
        }
      }
      const { user_id: _omitUserId, ...rest } = {
        ...quiz,
        quiz_hash: quizHash,
      };
      void _omitUserId;
      yield JSON.stringify(rest);
      isFirstQuiz = false;
    }
    offset += batch.length;
  }

  yield `],\n  "results": [`;

  offset = 0;
  let isFirstResult = true;
  while (true) {
    const batch = await db.results
      .where("user_id")
      .equals(userId)
      .offset(offset)
      .limit(BATCH_SIZE)
      .toArray();
    if (batch.length === 0) break;

    for (const result of batch) {
      if (!result) continue;
      if (!isFirstResult) yield ",";
      const { user_id: _omitUserId, ...rest } = result;
      void _omitUserId;
      yield JSON.stringify(rest);
      isFirstResult = false;
    }
    offset += batch.length;
  }

  yield `]\n}`;
}

/**
 * Download data as a JSON file using streaming to minimize memory usage.
 */
export async function downloadDataAsFile(userId: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    // Non-browser environment: nothing to download.
    return;
  }

  // Stream chunks to avoid holding the full export in memory on low-end devices.
  if (typeof ReadableStream === "undefined") {
    // Fallback for environments without streams (should be rare).
    const parts: string[] = [];
    for await (const chunk of generateJSONExport(userId)) {
      parts.push(chunk);
    }
    const blob = new Blob(parts, { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `certprep-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(
      controller: ReadableStreamDefaultController<Uint8Array>,
    ): Promise<void> {
      try {
        for await (const chunk of generateJSONExport(userId)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const response = new Response(stream, {
    headers: { "Content-Type": "application/json" },
  });
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `certprep-backup-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate imported data structure.
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== "string") return false;
  if (typeof obj.exportedAt !== "string") return false;
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
  mode: ImportMode = "merge",
): Promise<ImportResult> {
  if (mode === "smart") {
    return importDataSmart(data, userId);
  }

  const sanitizedQuizzes: Quiz[] = [];
  const quizIds = new Set<string>();

  for (const quiz of data.quizzes) {
    const sanitizedQuiz = await sanitizeQuizRecord(quiz, userId);
    if (!sanitizedQuiz) continue;
    if (quizIds.has(sanitizedQuiz.id)) {
      console.warn(
        "Skipped duplicate quiz id during import:",
        sanitizedQuiz.id,
      );
      continue;
    }
    sanitizedQuizzes.push(sanitizedQuiz);
    quizIds.add(sanitizedQuiz.id);
  }

  const existingQuizIds =
    mode === "merge"
      ? new Set<string>(
        (await db.quizzes.where("user_id").equals(userId).toArray()).map(
          (quiz) => quiz.id,
        ),
      )
      : new Set<string>();
  const allowedQuizIds = new Set<string>([...quizIds, ...existingQuizIds]);

  const sanitizedResults: Result[] = [];
  const resultIds = new Set<string>();

  for (const result of data.results) {
    const sanitizedResult = sanitizeResultRecord(result, userId);
    if (!sanitizedResult) continue;
    if (!allowedQuizIds.has(sanitizedResult.quiz_id)) {
      console.warn(
        "Skipped result referencing missing quiz during import:",
        sanitizedResult.id,
      );
      continue;
    }
    if (resultIds.has(sanitizedResult.id)) {
      console.warn(
        "Skipped duplicate result id during import:",
        sanitizedResult.id,
      );
      continue;
    }
    sanitizedResults.push(sanitizedResult);
    resultIds.add(sanitizedResult.id);
  }

  let quizzesImported = 0;
  let resultsImported = 0;

  if (mode === "replace") {
    if (sanitizedQuizzes.length === 0 && sanitizedResults.length === 0) {
      throw new Error("Import aborted: no valid quizzes or results to import.");
    }

    await db.transaction(
      "rw",
      db.quizzes,
      db.results,
      db.syncState,
      async () => {
        await Promise.all([
          db.quizzes.where("user_id").equals(userId).delete(),
          db.results.where("user_id").equals(userId).delete(),
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
      },
    );

    return { quizzesImported, resultsImported };
  }

  await db.transaction("rw", db.quizzes, db.results, async () => {
    const quizzesInDb = await db.quizzes
      .where("user_id")
      .equals(userId)
      .toArray();
    const mergedExistingQuizIds = new Set<string>(
      quizzesInDb.map((quiz) => quiz.id),
    );
    const quizzesToAdd = sanitizedQuizzes.filter(
      (quiz) => !mergedExistingQuizIds.has(quiz.id),
    );

    if (quizzesToAdd.length > 0) {
      await db.quizzes.bulkPut(quizzesToAdd);
      quizzesImported = quizzesToAdd.length;
      quizzesToAdd.forEach((quiz) => mergedExistingQuizIds.add(quiz.id));
    }

    const resultsInDb = await db.results
      .where("user_id")
      .equals(userId)
      .toArray();
    const mergedExistingResultIds = new Set<string>(
      resultsInDb.map((result) => result.id),
    );
    const resultsToAdd = sanitizedResults.filter(
      (result) =>
        mergedExistingQuizIds.has(result.quiz_id) &&
        !mergedExistingResultIds.has(result.id),
    );

    if (resultsToAdd.length > 0) {
      await db.results.bulkPut(resultsToAdd);
      resultsImported = resultsToAdd.length;
    }
  });

  return { quizzesImported, resultsImported };
}

async function findMatchingQuiz(
  importedQuiz: Quiz,
  existingByHash: Map<string, Quiz>,
  existingByTitle: Map<string, Quiz[]>,
  allowTitleFallback: boolean,
): Promise<Quiz | null> {
  if (importedQuiz.quiz_hash) {
    const hashMatch = existingByHash.get(importedQuiz.quiz_hash);
    if (hashMatch) {
      return hashMatch;
    }
  }

  if (!allowTitleFallback || !importedQuiz.title) return null;

  const normalizedTitle = normalizeTitle(importedQuiz.title);
  if (!normalizedTitle) return null;

  const candidates = existingByTitle.get(normalizedTitle) ?? [];
  if (candidates.length === 0) return null;

  const importedQuestionCount = importedQuiz.questions.length;
  const importedTags = normalizeTags(importedQuiz.tags);

  return (
    candidates.find((quiz) => {
      if (isSRSQuiz(quiz, quiz.user_id)) return false;
      if (quiz.questions.length !== importedQuestionCount) return false;
      const quizTags = normalizeTags(quiz.tags);
      return haveEqualTags(importedTags, quizTags);
    }) ?? null
  );
}

function computeResultSignature(result: Result): string {
  return [
    result.quiz_id,
    result.timestamp,
    result.mode,
    result.score,
    result.time_taken_seconds,
    result.session_type ?? "",
  ].join(":");
}

export async function importDataSmart(
  data: ExportData,
  userId: string,
): Promise<ImportResult> {
  const sanitizedQuizzes: Quiz[] = [];
  const quizIds = new Set<string>();
  const hashComputationFailed = new Set<string>();
  const missingHashInImport = new Set<string>();

  for (const quiz of data.quizzes) {
    const sanitizedQuiz = await sanitizeQuizRecord(quiz, userId);
    if (!sanitizedQuiz) continue;
    if (quizIds.has(sanitizedQuiz.id)) {
      console.warn(
        "Skipped duplicate quiz id during import:",
        sanitizedQuiz.id,
      );
      continue;
    }

    if (!sanitizedQuiz.quiz_hash) {
      missingHashInImport.add(sanitizedQuiz.id);
      try {
        sanitizedQuiz.quiz_hash = await computeQuizHash(sanitizedQuiz);
      } catch (error) {
        hashComputationFailed.add(sanitizedQuiz.id);
        console.warn(
          "Failed to compute quiz hash during smart import:",
          sanitizedQuiz.id,
          error,
        );
      }
    }

    sanitizedQuizzes.push(sanitizedQuiz);
    quizIds.add(sanitizedQuiz.id);
  }

  const sanitizedResults: Result[] = [];
  const resultIds = new Set<string>();

  for (const result of data.results) {
    const sanitizedResult = sanitizeResultRecord(result, userId);
    if (!sanitizedResult) continue;
    if (resultIds.has(sanitizedResult.id)) {
      console.warn(
        "Skipped duplicate result id during import:",
        sanitizedResult.id,
      );
      continue;
    }
    sanitizedResults.push(sanitizedResult);
    resultIds.add(sanitizedResult.id);
  }

  let quizzesImported = 0;
  let quizzesMerged = 0;
  let resultsImported = 0;
  let resultsDeduplicated = 0;

  await db.transaction("rw", db.quizzes, db.results, async () => {
    const quizzesInDb = await db.quizzes
      .where("user_id")
      .equals(userId)
      .toArray();
    const quizIdMap = new Map<string, string>();
    const quizzesToAdd: Quiz[] = [];
    const activeExisting = quizzesInDb.filter(
      (quiz) => quiz.deleted_at === null || quiz.deleted_at === undefined,
    );
    const deletedExisting = quizzesInDb.filter(
      (quiz) => quiz.deleted_at !== null && quiz.deleted_at !== undefined,
    );
    const activeByHash = indexByHash(activeExisting);
    const deletedByHash = indexByHash(deletedExisting);
    const activeByTitle = indexByTitle(activeExisting);
    const deletedByTitle = indexByTitle(deletedExisting);

    for (const quiz of sanitizedQuizzes) {
      const isDeletedImport =
        quiz.deleted_at !== null && quiz.deleted_at !== undefined;
      const allowTitleFallback =
        !hashComputationFailed.has(quiz.id) &&
        missingHashInImport.has(quiz.id);
      const match = await findMatchingQuiz(
        quiz,
        isDeletedImport ? deletedByHash : activeByHash,
        isDeletedImport ? deletedByTitle : activeByTitle,
        allowTitleFallback,
      );
      if (match) {
        quizIdMap.set(quiz.id, match.id);
        quizzesMerged += 1;
        continue;
      }
      quizIdMap.set(quiz.id, quiz.id);
      quizzesToAdd.push(quiz);
    }

    if (quizzesToAdd.length > 0) {
      await db.quizzes.bulkPut(quizzesToAdd);
      quizzesImported = quizzesToAdd.length;
      quizzesInDb.push(...quizzesToAdd);
    }

    const allowedQuizIds = new Set<string>(
      quizzesInDb.map((quiz) => quiz.id),
    );

    const resultsInDb = await db.results
      .where("user_id")
      .equals(userId)
      .toArray();
    const existingResultIds = new Set<string>(
      resultsInDb.map((result) => result.id),
    );
    const existingSignatures = new Set<string>(
      resultsInDb.map((result) => computeResultSignature(result)),
    );
    const seenSignatures = new Set<string>();
    const resultsToAdd: Result[] = [];

    for (const result of sanitizedResults) {
      const mappedQuizId = quizIdMap.get(result.quiz_id) ?? result.quiz_id;
      if (!allowedQuizIds.has(mappedQuizId)) {
        console.warn(
          "Skipped result referencing missing quiz during smart import:",
          result.id,
        );
        continue;
      }

      const remappedResult: Result = {
        ...result,
        quiz_id: mappedQuizId,
      };
      const signature = computeResultSignature(remappedResult);

      if (existingResultIds.has(remappedResult.id)) {
        resultsDeduplicated += 1;
        continue;
      }

      if (existingSignatures.has(signature) || seenSignatures.has(signature)) {
        resultsDeduplicated += 1;
        continue;
      }

      seenSignatures.add(signature);
      resultsToAdd.push(remappedResult);
    }

    if (resultsToAdd.length > 0) {
      await db.results.bulkPut(resultsToAdd);
      resultsImported = resultsToAdd.length;
    }
  });

  return {
    quizzesImported,
    quizzesMerged,
    resultsImported,
    resultsDeduplicated,
  };
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTags(tags: string[] | undefined | null): string[] {
  if (!tags) return [];
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .sort();
}

function haveEqualTags(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function indexByHash(quizzes: Quiz[]): Map<string, Quiz> {
  const map = new Map<string, Quiz>();
  for (const quiz of quizzes) {
    if (quiz.quiz_hash) {
      map.set(quiz.quiz_hash, quiz);
    }
  }
  return map;
}

function indexByTitle(quizzes: Quiz[]): Map<string, Quiz[]> {
  const map = new Map<string, Quiz[]>();
  for (const quiz of quizzes) {
    if (!quiz.title) continue;
    const key = normalizeTitle(quiz.title);
    const existing = map.get(key);
    if (existing) {
      existing.push(quiz);
    } else {
      map.set(key, [quiz]);
    }
  }
  return map;
}

/**
 * Clear all data (factory reset).
 */
export async function clearAllData(): Promise<void> {
  await db.transaction("rw", db.quizzes, db.results, db.syncState, async () => {
    await Promise.all([
      db.quizzes.clear(),
      db.results.clear(),
      db.syncState.clear(),
    ]);
  });

  // Guard against SSR - storage APIs only exist in browser context
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();
  }

  await requestServiceWorkerCacheClear();
}

/**
 * Get storage usage statistics.
 */
export async function getStorageStats(
  userId: string | null | undefined,
): Promise<{
  quizCount: number;
  resultCount: number;
  estimatedSizeKB: number;
}> {
  if (!userId) {
    return { quizCount: 0, resultCount: 0, estimatedSizeKB: 0 };
  }

  // Optimized: Use count() instead of toArray() to avoid loading all data
  // Filter out soft-deleted quizzes (deleted_at !== null)
  const quizCount = await db.quizzes
    .where("user_id")
    .equals(userId)
    .filter((quiz) => quiz.deleted_at === null || quiz.deleted_at === undefined)
    .count();
  const resultCount = await db.results.where("user_id").equals(userId).count();

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

/**
 * Get counts of soft-deleted (tombstoned) items pending cleanup.
 */
export async function getDeletedItemsStats(
  userId: string | null | undefined,
): Promise<{
  deletedQuizCount: number;
  deletedResultCount: number;
}> {
  if (!userId) {
    return { deletedQuizCount: 0, deletedResultCount: 0 };
  }

  const deletedQuizCount = await db.quizzes
    .where("user_id")
    .equals(userId)
    .filter((quiz) => quiz.deleted_at !== null && quiz.deleted_at !== undefined)
    .count();

  const deletedResultCount = await db.results
    .where("user_id")
    .equals(userId)
    .filter((result) => result.deleted_at !== null && result.deleted_at !== undefined)
    .count();

  return { deletedQuizCount, deletedResultCount };
}

/**
 * Permanently remove soft-deleted (tombstoned) items from local storage.
 * This frees up space but means deletions can no longer sync to other devices.
 */
export async function purgeDeletedItems(
  userId: string,
): Promise<{
  quizzesPurged: number;
  resultsPurged: number;
}> {
  let quizzesPurged = 0;
  let resultsPurged = 0;

  await db.transaction("rw", db.quizzes, db.results, async () => {
    // Find and delete tombstoned quizzes
    const deletedQuizzes = await db.quizzes
      .where("user_id")
      .equals(userId)
      .filter((quiz) => quiz.deleted_at !== null && quiz.deleted_at !== undefined)
      .toArray();

    if (deletedQuizzes.length > 0) {
      const quizIds = deletedQuizzes.map((q) => q.id);
      await db.quizzes.bulkDelete(quizIds);
      quizzesPurged = quizIds.length;
    }

    // Find and delete tombstoned results
    const deletedResults = await db.results
      .where("user_id")
      .equals(userId)
      .filter((result) => result.deleted_at !== null && result.deleted_at !== undefined)
      .toArray();

    if (deletedResults.length > 0) {
      const resultIds = deletedResults.map((r) => r.id);
      await db.results.bulkDelete(resultIds);
      resultsPurged = resultIds.length;
    }
  });

  return { quizzesPurged, resultsPurged };
}
