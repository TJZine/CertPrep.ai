import { Dexie } from 'dexie';
import { db } from './index';
import { sanitizeQuestionText } from '@/lib/sanitize';
import { calculatePercentage, generateUUID, hashAnswer } from '@/lib/utils';
import type { Question, Quiz } from '@/types/quiz';
import { computeQuizHash } from '@/lib/sync/quizDomain';
import type { QuizImportInput } from '@/validators/quizSchema';
import { formatValidationErrors, validateQuizImport, QuestionSchema } from '@/validators/quizSchema';
import { z } from 'zod';

export interface CreateQuizInput {
  title: string;
  description?: string;
  questions: Question[];
  tags?: string[];
  sourceId?: string;
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

export function sanitizeQuestions(questions: unknown[]): Question[] {
  // Validate structure first
  const parsedQuestions = z.array(QuestionSchema).safeParse(questions);
  
  if (!parsedQuestions.success) {
    // If validation fails, we log it but try to salvage what we can or throw?
    // For now, let's throw to prevent bad data from entering the DB, as per code review.
    const errorMsg = formatValidationErrors(parsedQuestions.error.issues.map(issue => ({
      path: issue.path.map(p => p.toString()),
      message: issue.message
    })));
    throw new Error(`Invalid questions data: ${errorMsg}`);
  }

  return parsedQuestions.data.map((q) => {
    // We can trust the shape now, but we still want to sanitize text fields for XSS prevention
    const options = q.options;
    
    const sanitizedOptions: Record<string, string> = Object.entries(options).reduce(
      (acc, [key, value]) => {
        acc[key] = sanitizeQuestionText(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    // Destructure to omit correct_answer from the returned object
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { correct_answer, ...rest } = q;

    return {
      ...rest,
      id: String(q.id),
      category: sanitizeQuestionText(q.category),
      question: sanitizeQuestionText(q.question),
      explanation: sanitizeQuestionText(q.explanation),
      distractor_logic: q.distractor_logic ? sanitizeQuestionText(q.distractor_logic) : undefined,
      ai_prompt: q.ai_prompt ? sanitizeQuestionText(q.ai_prompt) : undefined,
      user_notes: q.user_notes ? sanitizeQuestionText(q.user_notes) : undefined,
      options: sanitizedOptions,
      correct_answer_hash: q.correct_answer_hash,
      correct_answer: q.correct_answer ? sanitizeQuestionText(q.correct_answer) : undefined,
    };
  });
}

/**
 * Validates, sanitizes, and persists a new quiz.
 */
export async function createQuiz(input: QuizImportInput, meta: { userId: string; sourceId?: string }): Promise<Quiz> {
  if (!meta.userId) {
    throw new Error('Missing userId for quiz creation.');
  }
  const validation = validateQuizImport(input);

  if (!validation.success || !validation.data) {
    const message = formatValidationErrors(validation.errors ?? []);
    throw new Error(`Invalid quiz import: ${message}`);
  }

  const sanitizedQuestions = await Promise.all(
    validation.data.questions.map(async (q) => {
      const sanitized = sanitizeQuestions([q])[0];
      if (!sanitized) throw new Error('Failed to sanitize question');
      
      // If the input has a raw correct_answer, hash it.
      // If it already has a hash (importing existing export), keep it.
      // Note: The validator might need adjustment if we strictly require one or the other.
      // For now, we assume the input might have the raw answer we need to hash.
      const qWithAnswer = q as Question & { correct_answer?: string };
      let hash = qWithAnswer.correct_answer_hash;
      if (!hash && qWithAnswer.correct_answer) {
        hash = await hashAnswer(qWithAnswer.correct_answer);
      }
      if (!hash) {
        throw new Error(`Question ${sanitized.id} is missing correct_answer_hash`);
      }
      
      const { correct_answer: _correct_answer, ...rest } = sanitized;
      void _correct_answer;
      
      return {
        ...rest,
        correct_answer_hash: hash,
      };
    })
  );

  const sanitizedTitle = sanitizeQuestionText(validation.data.title);
  const sanitizedDescription = sanitizeQuestionText(validation.data.description ?? '');
  const sanitizedTags = (validation.data.tags ?? []).map((tag) => sanitizeQuestionText(tag));
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
    .where('user_id').equals(userId)
    .and(quiz => quiz.deleted_at === null || quiz.deleted_at === undefined)
    .toArray();
  
  return quizzes.sort((a, b) => b.created_at - a.created_at);
}

/**
 * Retrieves a single quiz by its identifier.
 */
export async function getQuizById(id: string, userId: string): Promise<Quiz | undefined> {
  const quiz = await db.quizzes.get(id);
  if (!quiz || quiz.user_id !== userId) {
    return undefined;
  }
  return quiz;
}

/**
 * Searches quizzes by title and tags with case-insensitive matching.
 */
export async function searchQuizzes(query: string, userId: string): Promise<Quiz[]> {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return getAllQuizzes(userId);
  }

  return db.quizzes
    .where('user_id').equals(userId)
    .and(quiz => quiz.deleted_at === null || quiz.deleted_at === undefined)
    .filter((quiz) => {
      const titleMatch = quiz.title.toLowerCase().includes(trimmedQuery);
      const tagMatch = quiz.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery));
      return titleMatch || tagMatch;
    })
    .toArray();
}

/**
 * Updates a quiz in place, sanitizing questions when provided.
 */
export async function updateQuiz(
  id: string,
  userId: string,
  updates: Partial<Omit<Quiz, 'id' | 'created_at'>>,
): Promise<void> {
  await db.transaction('rw', db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error('Quiz not found.');
    }
    if (existing.user_id !== userId) {
      throw new Error('Unauthorized quiz update.');
    }

    const sanitizedUpdates: Partial<Omit<Quiz, 'id' | 'created_at'>> = { ...updates };

    if (updates.questions !== undefined) {
      // We need to handle hashing BEFORE sanitization strips the correct_answer.
      // We also need to respect existing hashes if provided.
      const rawQuestions = updates.questions;
      const sanitizedQuestions = sanitizeQuestions(rawQuestions);

      sanitizedUpdates.questions = await Promise.all(
        sanitizedQuestions.map(async (q, index) => {
          const rawQ = rawQuestions[index];
          // Cast rawQ to access correct_answer safely as it might be in the update input
          const rawQWithAnswer = rawQ as Question & { correct_answer?: string };

          let hash = q.correct_answer_hash;
          
          // If no hash exists on the sanitized output (meaning none was preserved),
          // try to compute it from the raw input's correct_answer.
          if (!hash && rawQWithAnswer.correct_answer) {
            // Wrap async crypto in Dexie.waitFor to keep transaction alive
            hash = await Dexie.waitFor(hashAnswer(rawQWithAnswer.correct_answer));
          }

          if (!hash) {
            // Fallback: check if the existing question had a hash we can preserve
            // if this is an update to an existing question.
            const existingQ = existing.questions.find(eq => eq.id === q.id);
            if (existingQ?.correct_answer_hash) {
              hash = existingQ.correct_answer_hash;
            }
          }

          if (!hash) {
            throw new Error(`Question ${q.id} is missing correct_answer_hash`);
          }

          const { correct_answer: _correct_answer, ...restOfQuestion } = q;
          void _correct_answer;
          return { ...restOfQuestion, correct_answer_hash: hash };
        }),
      );
    }

    if (updates.title !== undefined) {
      sanitizedUpdates.title = sanitizeQuestionText(updates.title);
    }

    if (updates.description !== undefined) {
      sanitizedUpdates.description = sanitizeQuestionText(updates.description);
    }

    if (updates.tags !== undefined) {
      sanitizedUpdates.tags = updates.tags.map((tag) => sanitizeQuestionText(tag));
    }

    const nextTitle = sanitizedUpdates.title ?? existing.title;
    const nextDescription = sanitizedUpdates.description ?? existing.description;
    const nextTags = sanitizedUpdates.tags ?? existing.tags;
    const nextQuestions = sanitizedUpdates.questions ?? existing.questions;
    const shouldBumpVersion = ['questions', 'title', 'description', 'tags'].some(
      (key) => key in sanitizedUpdates,
    );
    const updatedAt = shouldBumpVersion || 'deleted_at' in sanitizedUpdates ? Date.now() : (existing.updated_at ?? existing.created_at);
    const nextVersion = shouldBumpVersion ? existing.version + 1 : existing.version;
    
    // Wrap async crypto in Dexie.waitFor
    const nextHash = await Dexie.waitFor(computeQuizHash({
      title: nextTitle,
      description: nextDescription,
      tags: nextTags,
      questions: nextQuestions,
    }));

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
  await db.transaction('rw', db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error('Quiz not found.');
    }
    if (existing.user_id !== userId) {
      throw new Error('Unauthorized quiz delete.');
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
  await db.transaction('rw', db.quizzes, async () => {
    const existing = await db.quizzes.get(id);
    if (!existing) {
      throw new Error('Quiz not found.');
    }
    if (existing.user_id !== userId) {
      throw new Error('Unauthorized quiz restore.');
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
export async function getQuizStats(quizId: string, userId: string): Promise<QuizStats> {
  const attempts = await db.results.where('[user_id+quiz_id]').equals([userId, quizId]).sortBy('timestamp');
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
  const totalStudyTime = attempts.reduce((sum, attempt) => sum + attempt.time_taken_seconds, 0);

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
export async function updateQuestionNotes(quizId: string, questionId: string, notes: string, userId: string): Promise<void> {
  await db.transaction('rw', db.quizzes, async () => {
    const quiz = await db.quizzes.get(quizId);

    if (!quiz) {
      throw new Error('Quiz not found.');
    }
    if (quiz.user_id !== userId) {
      throw new Error('Unauthorized quiz update.');
    }

    const updatedQuestions = quiz.questions.map((question) =>
      question.id === questionId ? { ...question, user_notes: sanitizeQuestionText(notes) } : question,
    );

    const updatedAt = Date.now();
    const nextVersion = quiz.version + 1;
    
    // Wrap async crypto in Dexie.waitFor
    const nextHash = await Dexie.waitFor(computeQuizHash({
      title: quiz.title,
      description: quiz.description,
      tags: quiz.tags,
      questions: updatedQuestions,
    }));

    await db.quizzes.update(quizId, { questions: updatedQuestions, updated_at: updatedAt, version: nextVersion, quiz_hash: nextHash });
  });
}
