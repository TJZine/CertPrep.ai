import { Dexie } from "dexie";
import { db } from "./index";
import { NIL_UUID } from "@/lib/constants";
import { sanitizeQuestionText } from "@/lib/sanitize";
import { calculatePercentage, generateUUID, hashAnswer } from "@/lib/utils";
import type { Question, Quiz } from "@/types/quiz";
import { computeQuizHash } from "@/lib/sync/quizDomain";
import type { QuizImportInput } from "@/validators/quizSchema";
import {
  formatValidationErrors,
  validateQuizImport,
  QuestionSchema,
} from "@/validators/quizSchema";
import { z } from "zod";

export interface CreateQuizInput {
  title: string;
  description?: string;
  questions: Question[];
  tags?: string[];
  sourceId?: string;
}

/**
 * Stable sort helper: Newest created first -> Alphabetical by title.
 */
export function sortQuizzesByNewest(quizzes: Quiz[]): Quiz[] {
  return [...quizzes].sort((a, b) => {
    const timeDiff = b.created_at - a.created_at;
    if (timeDiff !== 0) return timeDiff;
    return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  });
}

export interface QuizStats {
  quizId: string;
  attemptCount: number;
  lastAttemptScore: number | null;
  lastAttemptDate: number | null;
  averageScore: number | null;
  bestScore: number | null;
  totalStudyTime: number;
}

export async function sanitizeQuestions(
  questions: unknown[],
): Promise<Question[]> {
  // Validate structure first
  const parsedQuestions = z.array(QuestionSchema).safeParse(questions);

  if (!parsedQuestions.success) {
    // If validation fails, we log it but try to salvage what we can or throw?
    // For now, let's throw to prevent bad data from entering the DB, as per code review.
    const errorMsg = formatValidationErrors(
      parsedQuestions.error.issues.map((issue) => ({
        path: issue.path.map((segment) =>
          typeof segment === "symbol" ? segment.toString() : segment,
        ),
        message: issue.message,
      })),
    );
    throw new Error(`Invalid questions data: ${errorMsg}`);
  }

  return Promise.all(
    parsedQuestions.data.map(async (q) => {
      // We can trust the shape now, but we still want to sanitize text fields for XSS prevention
      const options = q.options;

      const sanitizedOptions: Record<string, string> = Object.entries(
        options,
      ).reduce(
        (acc, [key, value]) => {
          acc[key] = sanitizeQuestionText(value);
          return acc;
        },
        {} as Record<string, string>,
      );

      let hash = q.correct_answer_hash;

      // If no hash exists, try to compute it from correct_answer
      if (!hash && q.correct_answer) {
        hash = await hashAnswer(q.correct_answer);
      }

      if (!hash) {
        throw new Error(`Question ${q.id} is missing correct_answer_hash`);
      }

      // Destructure to omit correct_answer from the returned object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { correct_answer: _omitted, ...rest } = q;

      return {
        ...rest,
        id: String(q.id),
        category: sanitizeQuestionText(q.category),
        question: sanitizeQuestionText(q.question),
        explanation: sanitizeQuestionText(q.explanation),
        distractor_logic: q.distractor_logic
          ? sanitizeQuestionText(q.distractor_logic)
          : undefined,
        ai_prompt: q.ai_prompt
          ? sanitizeQuestionText(q.ai_prompt)
          : undefined,
        user_notes: q.user_notes
          ? sanitizeQuestionText(q.user_notes)
          : undefined,
        options: sanitizedOptions,
        correct_answer_hash: hash,
      };
    }),
  );
}

/**
 * Validates, sanitizes, and persists a new quiz.
 */
export async function createQuiz(
  input: QuizImportInput,
  meta: { userId: string; sourceId?: string },
): Promise<Quiz> {
  if (!meta.userId) {
    throw new Error("Missing userId for quiz creation.");
  }
  const validation = validateQuizImport(input);

  if (!validation.success || !validation.data) {
    const message = formatValidationErrors(validation.errors ?? []);
    throw new Error(`Invalid quiz import: ${message}`);
  }

  const validatedData = validation.data;
  const sanitizedQuestions = await sanitizeQuestions(validatedData.questions);

  const sanitizedTitle = sanitizeQuestionText(validation.data.title);
  const sanitizedDescription = sanitizeQuestionText(
    validation.data.description ?? "",
  );
  const sanitizedTags = (validation.data.tags ?? []).map((tag) =>
    sanitizeQuestionText(tag),
  );
  const createdAt = Date.now();
  const quiz: Quiz = {
    id: generateUUID(),
    user_id: meta.userId,
    title: sanitizedTitle,
    description: sanitizedDescription,
    created_at: createdAt,
    updated_at: createdAt,
    questions: sanitizedQuestions,
    tags: sanitizedTags,
    version: validation.data.version ?? 1,
    sourceId: meta?.sourceId,
    deleted_at: null,
    quiz_hash: await computeQuizHash({
      title: sanitizedTitle,
      description: sanitizedDescription,
      tags: sanitizedTags,
      questions: sanitizedQuestions,
    }),
    last_synced_at: null,
    last_synced_version: null,
  };

  await db.quizzes.add(quiz);
  return quiz;
}

/**
 * Retrieves all quizzes ordered from newest to oldest.
 */
export async function getAllQuizzes(userId: string): Promise<Quiz[]> {
  const quizzes = await db.quizzes
    .where("user_id")
    .equals(userId)
    .and((quiz) => quiz.deleted_at === null || quiz.deleted_at === undefined)
    .toArray();

  return sortQuizzesByNewest(quizzes);
}

/**
 * Retrieves a single quiz by its identifier.
 */
export async function getQuizById(
  id: string,
  userId: string,
): Promise<Quiz | undefined> {
  const quiz = await db.quizzes.get(id);
  if (!quiz || quiz.user_id !== userId) {
    return undefined;
  }
  return quiz;
}

/**
 * Searches quizzes by title and tags with case-insensitive matching.
 */
export async function searchQuizzes(
  query: string,
  userId: string,
): Promise<Quiz[]> {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return getAllQuizzes(userId);
  }

  const results = await db.quizzes
    .where("user_id")
    .equals(userId)
    .and((quiz) => quiz.deleted_at === null || quiz.deleted_at === undefined)
    .filter((quiz) => {
      const titleMatch = quiz.title.toLowerCase().includes(trimmedQuery);
      const tagMatch = quiz.tags.some((tag) =>
        tag.toLowerCase().includes(trimmedQuery),
      );
      return titleMatch || tagMatch;
    })
    .toArray();

  return sortQuizzesByNewest(results);
}

/**
 * Updates a quiz in place, sanitizing questions when provided.
 */
export async function updateQuiz(
  id: string,
  userId: string,
  updates: Partial<Omit<Quiz, "id" | "created_at">>,
): Promise<void> {
  await db.transaction("rw", db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error("Quiz not found.");
    }
    if (existing.user_id !== userId) {
      throw new Error("Unauthorized quiz update.");
    }

    const sanitizedUpdates: Partial<Omit<Quiz, "id" | "created_at">> = {
      ...updates,
    };

    if (updates.questions !== undefined) {
      // We need to handle hashing BEFORE sanitization strips the correct_answer.
      // We also need to respect existing hashes if provided.
      const rawQuestions = updates.questions;
      // Pre-index existing questions for O(1) lookup
      const existingById = new Map(existing.questions.map((eq) => [eq.id, eq]));

      // If we are just updating questions, we probably have the full question object.
      // Let's try to map existing hashes to the raw questions if they are missing.
      const enrichedQuestions = rawQuestions.map((q) => {
        const existingQ = existingById.get(q.id);
        // Only backfill the hash when the caller hasn't supplied either
        // `correct_answer` or `correct_answer_hash`. If a new answer is
        // provided, let `sanitizeQuestions` compute a fresh hash.
        if (
          !q.correct_answer_hash &&
          !q.correct_answer &&
          existingQ?.correct_answer_hash
        ) {
          return { ...q, correct_answer_hash: existingQ.correct_answer_hash };
        }
        return q;
      });

      sanitizedUpdates.questions = await Dexie.waitFor(
        sanitizeQuestions(enrichedQuestions),
      );
    }

    if (updates.title !== undefined) {
      sanitizedUpdates.title = sanitizeQuestionText(updates.title);
    }

    if (updates.description !== undefined) {
      sanitizedUpdates.description = sanitizeQuestionText(updates.description);
    }

    if (updates.tags !== undefined) {
      sanitizedUpdates.tags = updates.tags.map((tag) =>
        sanitizeQuestionText(tag),
      );
    }

    const nextTitle = sanitizedUpdates.title ?? existing.title;
    const nextDescription =
      sanitizedUpdates.description ?? existing.description;
    const nextTags = sanitizedUpdates.tags ?? existing.tags;
    const nextQuestions = sanitizedUpdates.questions ?? existing.questions;
    const shouldBumpVersion = [
      "questions",
      "title",
      "description",
      "tags",
    ].some((key) => key in sanitizedUpdates);
    const updatedAt =
      shouldBumpVersion || "deleted_at" in sanitizedUpdates
        ? Date.now()
        : (existing.updated_at ?? existing.created_at);
    const nextVersion = shouldBumpVersion
      ? existing.version + 1
      : existing.version;

    // Wrap async crypto in Dexie.waitFor
    const nextHash = await Dexie.waitFor(
      computeQuizHash({
        title: nextTitle,
        description: nextDescription,
        tags: nextTags,
        questions: nextQuestions,
      }),
    );

    await db.quizzes.update(id, {
      ...sanitizedUpdates,
      version: nextVersion,
      updated_at: updatedAt,
      quiz_hash: nextHash,
      user_id: userId,
    });
  });
}

/**
 * Soft-deletes a quiz (sets deleted_at) but preserves associated results.
 */
export async function deleteQuiz(id: string, userId: string): Promise<void> {
  await db.transaction("rw", db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error("Quiz not found.");
    }
    if (existing.user_id !== userId && existing.user_id !== NIL_UUID) {
      throw new Error("Unauthorized quiz delete.");
    }
    const deletedAt = Date.now();
    await db.quizzes.update(id, {
      deleted_at: deletedAt,
      version: existing.version + 1,
      updated_at: deletedAt,
      user_id: userId,
    });
  });
}

export async function undeleteQuiz(id: string, userId: string): Promise<void> {
  await db.transaction("rw", db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error("Quiz not found.");
    }
    if (existing.user_id !== userId && existing.user_id !== NIL_UUID) {
      throw new Error("Unauthorized quiz restore.");
    }
    const updatedAt = Date.now();
    await db.quizzes.update(id, {
      deleted_at: null,
      version: existing.version + 1,
      updated_at: updatedAt,
      user_id: userId,
    });
  });
}

/**
 * Aggregates quiz statistics from associated results.
 */
export async function getQuizStats(
  quizId: string,
  userId: string,
): Promise<QuizStats> {
  const attempts = await db.results
    .where("[user_id+quiz_id]")
    .equals([userId, quizId])
    .sortBy("timestamp");
  const attemptCount = attempts.length;

  if (attemptCount === 0) {
    return {
      quizId,
      attemptCount: 0,
      lastAttemptScore: null,
      lastAttemptDate: null,
      averageScore: null,
      bestScore: null,
      totalStudyTime: 0,
    };
  }

  const lastAttempt = attempts[attemptCount - 1];
  if (!lastAttempt) {
    return {
      quizId,
      attemptCount,
      lastAttemptScore: null,
      lastAttemptDate: null,
      averageScore: null,
      bestScore: null,
      totalStudyTime: 0,
    };
  }
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const bestScore = Math.max(...attempts.map((attempt) => attempt.score));
  const averageScore = calculatePercentage(totalScore, attemptCount * 100);
  const totalStudyTime = attempts.reduce(
    (sum, attempt) => sum + attempt.time_taken_seconds,
    0,
  );

  return {
    quizId,
    attemptCount,
    lastAttemptScore: lastAttempt.score,
    lastAttemptDate: lastAttempt.timestamp,
    averageScore,
    bestScore,
    totalStudyTime,
  };
}

/**
 * Updates notes for a specific question within a quiz.
 */
export async function updateQuestionNotes(
  quizId: string,
  questionId: string,
  notes: string,
  userId: string,
): Promise<void> {
  await db.transaction("rw", db.quizzes, async () => {
    const quiz = await db.quizzes.get(quizId);

    if (!quiz) {
      throw new Error("Quiz not found.");
    }
    if (quiz.user_id !== userId && quiz.user_id !== NIL_UUID) {
      throw new Error("Unauthorized quiz update.");
    }

    const updatedQuestions = quiz.questions.map((question) =>
      question.id === questionId
        ? { ...question, user_notes: sanitizeQuestionText(notes) }
        : question,
    );

    const updatedAt = Date.now();
    const nextVersion = quiz.version + 1;

    // Wrap async crypto in Dexie.waitFor
    const nextHash = await Dexie.waitFor(
      computeQuizHash({
        title: quiz.title,
        description: quiz.description,
        tags: quiz.tags,
        questions: updatedQuestions,
      }),
    );

    await db.quizzes.update(quizId, {
      questions: updatedQuestions,
      updated_at: updatedAt,
      version: nextVersion,
      quiz_hash: nextHash,
    });
  });
}
