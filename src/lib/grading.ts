import { hashAnswer } from "@/lib/utils";
import type { Question } from "@/types/quiz";

export interface GradingResult {
  isCorrect: boolean;
  category: string;
}

/**
 * Evaluates a single answer against a question's correct answer.
 * Supports both hashed (preferred) and plaintext correct answer comparisons.
 */
export async function evaluateAnswer(
  question: Question,
  userAnswer: string | undefined | null,
): Promise<GradingResult> {
  const category = question.category || "Uncategorized";
  let isCorrect = false;

  if (userAnswer) {
    // Prioritize hash comparison if available
    if (question.correct_answer_hash) {
      const userHash = await hashAnswer(userAnswer);
      isCorrect = userHash === question.correct_answer_hash;
    } else if (question.correct_answer) {
      // Fallback to plaintext comparison (legacy or specific use cases)
      isCorrect = userAnswer === question.correct_answer;
    }
  }

  return { isCorrect, category };
}
