"use client";

import * as React from "react";
import { useQuizzes, useInitializeDatabase } from "@/hooks/useDatabase";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { deleteQuiz } from "@/db/quizzes";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { QuizGrid } from "@/components/dashboard/QuizGrid";
import { ImportModal } from "@/components/dashboard/ImportModal";
import { ModeSelectModal } from "@/components/dashboard/ModeSelectModal";
import { DeleteConfirmModal } from "@/components/dashboard/DeleteConfirmModal";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useToast } from "@/components/ui/Toast";
import type { Quiz } from "@/types/quiz";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

export default function DashboardPage(): React.ReactElement {
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quizzes, isLoading: quizzesLoading } = useQuizzes(
    effectiveUserId ?? undefined,
  );
  
  const { 
    quizStats, 
    overallStats, 
    isLoading: statsLoading 
  } = useDashboardStats(effectiveUserId ?? undefined);

  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [modeSelectQuiz, setModeSelectQuiz] = React.useState<Quiz | null>(null);
  const [deleteContext, setDeleteContext] = React.useState<{
    quiz: Quiz;
    attemptCount: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const { addToast } = useToast();

  const handleImportSuccess = (quiz: Quiz): void => {
    setIsImportModalOpen(false);
    addToast("success", `Successfully imported "${quiz.title}"`);
  };

  const handleStartQuiz = (quiz: Quiz): void => {
    setModeSelectQuiz(quiz);
  };

  const handleDeleteClick = (quiz: Quiz): void => {
    const attempts = quizStats.get(quiz.id)?.attemptCount ?? 0;
    setDeleteContext({ quiz, attemptCount: attempts });
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteContext) return;
    if (!effectiveUserId) {
      addToast("error", "Unable to delete quiz: missing user context.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteQuiz(deleteContext.quiz.id, effectiveUserId);
      addToast("success", `Deleted "${deleteContext.quiz.title}"`);
      setDeleteContext(null);
    } catch (error) {
      console.error("Failed to delete quiz", error);
      addToast("error", "Failed to delete quiz. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isInitialized || quizzesLoading || statsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your quiz library..." />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            Failed to initialize database
          </h2>
          <p className="mt-2 text-red-600">{dbError.message}</p>
          <p className="mt-4 text-sm text-red-500">
            Please ensure your browser supports IndexedDB and try refreshing the
            page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardHeader
        onImportClick={() => setIsImportModalOpen(true)}
        quizCount={quizzes.length}
      />

      {quizzes.length > 0 && overallStats ? (
        <div className="mt-8">
          <StatsBar
            totalQuizzes={overallStats.totalQuizzes}
            totalAttempts={overallStats.totalAttempts}
            averageScore={
              overallStats.totalAttempts > 0 ? overallStats.averageScore : null
            }
            totalStudyTime={overallStats.totalStudyTime}
          />
        </div>
      ) : null}

      <div className="mt-8">
        <QuizGrid
          quizzes={quizzes}
          quizStats={quizStats}
          onStartQuiz={handleStartQuiz}
          onDeleteQuiz={handleDeleteClick}
        />
      </div>

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        userId={effectiveUserId}
      />

      <ModeSelectModal
        quiz={modeSelectQuiz}
        isOpen={modeSelectQuiz !== null}
        onClose={() => setModeSelectQuiz(null)}
      />

      <DeleteConfirmModal
        quiz={deleteContext?.quiz ?? null}
        attemptCount={deleteContext?.attemptCount ?? 0}
        isOpen={deleteContext !== null}
        onClose={() => setDeleteContext(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </main>
  );
}
