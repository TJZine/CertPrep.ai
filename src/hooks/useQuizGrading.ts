import { useState, useEffect } from 'react';
import { hashAnswer } from '@/lib/utils';
import type { Quiz } from '@/types/quiz';

export interface GradingResult {
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  questionStatus: Record<string, boolean>; // questionId -> isCorrect
}

/**
 * Asynchronously grades a quiz result against hashed answers.
 */
export function useQuizGrading(quiz: Quiz | null, answers: Record<string, string>): { grading: GradingResult | null; isLoading: boolean } {
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect((): (() => void) | void => {
    if (!quiz || !answers) {
      setGrading(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const grade = async (): Promise<void> => {
      const status: Record<string, boolean> = {};
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      // We can run these in parallel
      await Promise.all(
        quiz.questions.map(async (q) => {
          const userAnswer = answers[q.id];
          if (!userAnswer) {
            unanswered++;
            status[q.id] = false;
            return;
          }

          // Hash the user's answer to compare
          const userHash = await hashAnswer(userAnswer);
          const isCorrect = userHash === q.correct_answer_hash;

          if (isCorrect) correct++;
          else incorrect++;
          
          status[q.id] = isCorrect;
        })
      );

      if (isMounted) {
        setGrading({
          correctCount: correct,
          incorrectCount: incorrect,
          unansweredCount: unanswered,
          questionStatus: status,
        });
        setIsLoading(false);
      }
    };

    grade();

    return () => {
      isMounted = false;
    };
  }, [quiz, answers]);

  return { grading, isLoading };
}
