"use client";

import * as React from "react";
import { BookOpen } from "lucide-react";
import { QuizCard } from "./QuizCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import type { Quiz } from "@/types/quiz";
import type { QuizStats } from "@/db/quizzes";

export interface QuizGridProps {
  quizzes: Quiz[];
  quizStats: Map<string, QuizStats>;
  onStartQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quiz: Quiz) => void;
  isLoading?: boolean;
}

/**
 * Responsive grid displaying quiz cards with loading and empty states.
 */
export function QuizGrid({
  quizzes,
  quizStats,
  onStartQuiz,
  onDeleteQuiz,
  isLoading = false,
}: QuizGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner text="Loading your quizzes..." />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
        title="No quizzes yet"
        description="Import your first quiz to get started. Upload a JSON file or paste quiz data."
      />
    );
  }

  return (
    <div data-testid="quiz-grid" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {quizzes.map((quiz) => (
        <QuizCard
          key={quiz.id}
          quiz={quiz}
          stats={quizStats.get(quiz.id) ?? null}
          onStart={onStartQuiz}
          onDelete={onDeleteQuiz}
        />
      ))}
    </div>
  );
}

export default QuizGrid;
