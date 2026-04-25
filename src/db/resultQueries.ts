import { db } from "./dbInstance";
import { evaluateAnswer } from "@/lib/grading";
import type { Result } from "@/types/result";

/**
 * Retrieves a result by its identifier.
 */
export async function getResultById(
  id: string,
  userId: string,
): Promise<Result | undefined> {
  const result = await db.results.get(id);
  if (result?.user_id !== userId || result?.deleted_at) return undefined;
  return result;
}

/**
 * Retrieves all results for a quiz ordered by newest first.
 */
export async function getResultsByQuizId(
  quizId: string,
  userId: string,
): Promise<Result[]> {
  const results = await db.results
    .where("[user_id+quiz_id]")
    .equals([userId, quizId])
    .filter((r) => !r.deleted_at)
    .sortBy("timestamp");
  return results.reverse();
}

/**
 * Retrieves all results ordered by newest first.
 */
export async function getAllResults(userId: string): Promise<Result[]> {
  const results = await db.results
    .where("user_id")
    .equals(userId)
    .filter((r) => !r.deleted_at)
    .sortBy("timestamp");
  return results.reverse();
}

/**
 * Returns the IDs of questions answered incorrectly for a given result.
 */
export async function getMissedQuestions(
  resultId: string,
  userId: string,
): Promise<string[]> {
  const result = await db.results.get(resultId);
  if (!result || result.deleted_at) {
    throw new Error("Result not found.");
  }
  if (result.user_id !== userId) {
    throw new Error("Result not accessible for this user.");
  }

  const quiz = await db.quizzes.get(result.quiz_id);
  if (!quiz || quiz.deleted_at != null) {
    throw new Error("Quiz not found.");
  }

  const questionResults = await Promise.all(
    quiz.questions.map(async (question) => {
      const questionId = String(question.id);
      const hasAnswer = Object.prototype.hasOwnProperty.call(
        result.answers,
        questionId,
      );
      if (!hasAnswer) return null;

      const userAnswer = result.answers[questionId];
      if (userAnswer == null) return null;

      const { isCorrect } = await evaluateAnswer(question, userAnswer);

      return !isCorrect ? String(question.id) : null;
    }),
  );

  return questionResults.filter((id): id is string => id !== null);
}
