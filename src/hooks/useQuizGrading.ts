import { useState, useEffect } from "react";
import { hashAnswer } from "@/lib/utils";
import type { Quiz } from "@/types/quiz";

export interface GradingResult {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questionStatus: Record<string, boolean>; // questionId -> isCorrect
}

/**
 * Asynchronously grades a quiz result against hashed answers.
 *
 * @param quiz - The quiz object containing questions and correct answer hashes.
 * @param answers - Map of Question ID to User Answer (ID).
 * @param questionIds - Optional array of question IDs to scope grading (for Smart Round / Review Missed).
 * @returns An object containing the `grading` result (null while loading), `isLoading` flag, and any `error`.
 */
export function useQuizGrading(
  quiz: Quiz | null,
  answers: Record<string, string>,
  questionIds?: string[],
): { grading: GradingResult | null; isLoading: boolean; error: Error | null } {
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize the answers string to prevent the effect from running on every render
  // useLiveQuery returns a new object reference every time, even if data hasn't changed
  const answersJson = JSON.stringify(answers);
  const questionIdsJson = JSON.stringify(questionIds);

  useEffect((): (() => void) | void => {
    if (!quiz || !answers) {
      setGrading(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setGrading(null); // Clear previous result while loading
    setError(null);

    const grade = async (): Promise<void> => {
      try {
        const status: Record<string, boolean> = {};
        let correct = 0;
        let incorrect = 0;
        let unanswered = 0;

        // If questionIds provided (Smart Round/Review Missed), only grade those questions
        const questionIdsSet = questionIds ? new Set(questionIds) : null;
        const questionsToGrade = questionIdsSet
          ? quiz.questions.filter((q) => questionIdsSet.has(q.id))
          : quiz.questions;

        // Collect results in a local array to avoid race conditions on shared counters
        const results = await Promise.all(
          questionsToGrade.map(async (q) => {
            const userAnswer = answers[q.id];
            if (!userAnswer) {
              return { id: q.id, status: "unanswered" as const };
            }

            // Hash the user's answer to compare
            const userHash = await hashAnswer(userAnswer);
            const isCorrect = userHash === q.correct_answer_hash;

            return {
              id: q.id,
              status: isCorrect ? ("correct" as const) : ("incorrect" as const),
            };
          }),
        );

        // Synchronously aggregate results
        results.forEach((result) => {
          if (result.status === "unanswered") {
            unanswered++;
            status[result.id] = false;
          } else if (result.status === "correct") {
            correct++;
            status[result.id] = true;
          } else {
            incorrect++;
            status[result.id] = false;
          }
        });

        if (isMounted) {
          setGrading({
            correctCount: correct,
            incorrectCount: incorrect,
            unansweredCount: unanswered,
            questionStatus: status,
          });
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Grading failed"));
          setIsLoading(false);
        }
      }
    };

    grade();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz, answersJson, questionIdsJson]); // Depend on JSON strings instead of objects

  return { grading, isLoading, error };
}