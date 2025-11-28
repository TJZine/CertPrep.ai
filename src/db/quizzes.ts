import { db } from './index';
import { sanitizeQuestionText } from '@/lib/sanitize';
import { calculatePercentage, generateUUID } from '@/lib/utils';
import type { Question, Quiz } from '@/types/quiz';
import type { QuizImportInput } from '@/validators/quizSchema';
import { formatValidationErrors, validateQuizImport } from '@/validators/quizSchema';

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

/**
 * Sanitizes all textual fields on questions to ensure safe rendering.
 */
export function sanitizeQuestions(questions: unknown[]): Question[] {
  return questions.map((q) => {
    const question = q as Record<string, unknown>;
    const options = question.options as Record<string, string>;
    
    const sanitizedOptions: Record<string, string> = Object.entries(options).reduce(
      (acc, [key, value]) => {
        acc[key] = sanitizeQuestionText(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    return {
      ...question,
      id: String(question.id),
      category: sanitizeQuestionText(question.category as string),
      question: sanitizeQuestionText(question.question as string),
      explanation: sanitizeQuestionText(question.explanation as string),
      distractor_logic: question.distractor_logic ? sanitizeQuestionText(question.distractor_logic as string) : question.distractor_logic,
      ai_prompt: question.ai_prompt ? sanitizeQuestionText(question.ai_prompt as string) : question.ai_prompt,
      user_notes: question.user_notes ? sanitizeQuestionText(question.user_notes as string) : question.user_notes,
      options: sanitizedOptions,
      // Pass through hash or raw answer (will be handled by createQuiz)
      correct_answer_hash: question.correct_answer_hash,
      correct_answer: question.correct_answer,
    } as unknown as Question;
  });
}

/**
 * Validates, sanitizes, and persists a new quiz.
 */
export async function createQuiz(input: QuizImportInput, meta?: { sourceId?: string }): Promise<Quiz> {
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
        hash = await import('@/lib/utils').then(m => m.hashAnswer(qWithAnswer.correct_answer!));
      }
      
      return {
        ...sanitized,
        correct_answer_hash: hash,
        // Remove plaintext answer if it exists on the object to avoid persisting it
        correct_answer: undefined,
      } as unknown as Question;
    })
  );

  const sanitizedTitle = sanitizeQuestionText(validation.data.title);
  const sanitizedDescription = sanitizeQuestionText(validation.data.description ?? '');
  const sanitizedTags = (validation.data.tags ?? []).map((tag) => sanitizeQuestionText(tag));
  const quiz: Quiz = {
    id: generateUUID(),
    title: sanitizedTitle,
    description: sanitizedDescription,
    created_at: Date.now(),
    questions: sanitizedQuestions,
    tags: sanitizedTags,
    version: validation.data.version ?? 1,
    sourceId: meta?.sourceId,
  };

  await db.quizzes.add(quiz);
  return quiz;
}

/**
 * Retrieves all quizzes ordered from newest to oldest.
 */
export async function getAllQuizzes(): Promise<Quiz[]> {
  return db.quizzes.orderBy('created_at').reverse().toArray();
}

/**
 * Retrieves a single quiz by its identifier.
 */
export async function getQuizById(id: string): Promise<Quiz | undefined> {
  return db.quizzes.get(id);
}

/**
 * Searches quizzes by title and tags with case-insensitive matching.
 */
export async function searchQuizzes(query: string): Promise<Quiz[]> {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) {
    return getAllQuizzes();
  }

  return db.quizzes
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
  updates: Partial<Omit<Quiz, 'id' | 'created_at'>>,
): Promise<void> {
  const existing = await db.quizzes.get(id);
  if (!existing) {
    throw new Error('Quiz not found.');
  }

  const sanitizedUpdates: Partial<Omit<Quiz, 'id' | 'created_at'>> = { ...updates };

  if (updates.questions !== undefined) {
    sanitizedUpdates.questions = sanitizeQuestions(updates.questions);
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

  await db.quizzes.update(id, sanitizedUpdates);
}

/**
 * Deletes a quiz and all associated results in a single transaction.
 */
export async function deleteQuiz(id: string): Promise<void> {
  await db.transaction('rw', db.quizzes, db.results, async () => {
    await db.results.where('quiz_id').equals(id).delete();
    await db.quizzes.delete(id);
  });
}

/**
 * Aggregates quiz statistics from associated results.
 */
export async function getQuizStats(quizId: string): Promise<QuizStats> {
  const attempts = await db.results.where('quiz_id').equals(quizId).sortBy('timestamp');
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
export async function updateQuestionNotes(quizId: string, questionId: string, notes: string): Promise<void> {
  const quiz = await db.quizzes.get(quizId);

  if (!quiz) {
    throw new Error('Quiz not found.');
  }

  const updatedQuestions = quiz.questions.map((question) =>
    question.id === questionId ? { ...question, user_notes: sanitizeQuestionText(notes) } : question,
  );

  await db.quizzes.update(quizId, { questions: updatedQuestions });
}
