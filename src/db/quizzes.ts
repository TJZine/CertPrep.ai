import { db } from './index';
import { sanitizeQuestionText } from '@/lib/sanitize';
import { calculatePercentage, generateUUID, hashAnswer } from '@/lib/utils';
import type { Question, Quiz } from '@/types/quiz';
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

    return {
      ...q,
      id: String(q.id),
      category: sanitizeQuestionText(q.category),
      question: sanitizeQuestionText(q.question),
      explanation: sanitizeQuestionText(q.explanation),
      distractor_logic: q.distractor_logic ? sanitizeQuestionText(q.distractor_logic) : undefined,
      ai_prompt: q.ai_prompt ? sanitizeQuestionText(q.ai_prompt) : undefined,
      user_notes: q.user_notes ? sanitizeQuestionText(q.user_notes) : undefined,
      options: sanitizedOptions,
      correct_answer_hash: q.correct_answer_hash,
      correct_answer: q.correct_answer,
    };
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
    
    // Validate that we aren't introducing questions without hashes
    sanitizedUpdates.questions.forEach(q => {
      if (!q.correct_answer_hash && !q.correct_answer) {
         throw new Error(`Question ${q.id} is missing correct_answer_hash`);
      }
    });
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
