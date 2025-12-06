"use client";
import * as React from "react";
import type { Quiz } from "@/types/quiz";

interface UseQuizState {
  quiz: Quiz | null;
  currentQuestionIndex: number;
}

/**
 * Placeholder hook for quiz state management.
 */
export function useQuiz(initialQuiz: Quiz | null = null): UseQuizState {
  const [quiz] = React.useState<Quiz | null>(initialQuiz);
  const [currentQuestionIndex] = React.useState(0);

  return { quiz, currentQuestionIndex };
}
