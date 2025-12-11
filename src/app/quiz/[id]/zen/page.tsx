"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { SmartRoundBanner } from "@/components/quiz/SmartRoundBanner";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { useInitializeDatabase, useQuiz } from "@/hooks/useDatabase";
import type { Question } from "@/types/quiz";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import {
  clearSmartRoundState,
  SMART_ROUND_QUESTIONS_KEY,
  SMART_ROUND_QUIZ_ID_KEY,
  SMART_ROUND_MISSED_COUNT_KEY,
  SMART_ROUND_FLAGGED_COUNT_KEY,
} from "@/lib/smartRoundStorage";

interface SmartRoundData {
  questionIds: string[];
  missedCount: number;
  flaggedCount: number;
}

/**
 * Page entry for Zen mode quizzes with Smart Round support.
 */
export default function ZenModePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.id as string;

  const isSmartRound = searchParams.get("mode") === "smart";

  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quiz, isLoading } = useQuiz(
    isInitialized ? quizId : undefined,
    effectiveUserId ?? undefined,
  );

  const [smartRoundData, setSmartRoundData] =
    React.useState<SmartRoundData | null>(null);
  const [filteredQuestions, setFilteredQuestions] = React.useState<
    Question[] | null
  >(null);

  React.useEffect(() => {
    if (isSmartRound && quiz) {
      try {
        const storedQuestionIds = sessionStorage.getItem(
          SMART_ROUND_QUESTIONS_KEY,
        );
        const storedQuizId = sessionStorage.getItem(SMART_ROUND_QUIZ_ID_KEY);
        const storedMissedCount = sessionStorage.getItem(
          SMART_ROUND_MISSED_COUNT_KEY,
        );
        const storedFlaggedCount = sessionStorage.getItem(
          SMART_ROUND_FLAGGED_COUNT_KEY,
        );

        if (storedQuestionIds && storedQuizId === quizId) {
          const questionIds: string[] = JSON.parse(storedQuestionIds);

          const filtered = quiz.questions.filter((q) =>
            questionIds.includes(q.id),
          );
          const orderedFiltered = questionIds
            .map((id) => filtered.find((q) => q.id === id))
            .filter((q): q is Question => q !== undefined);

          if (orderedFiltered.length > 0) {
            setFilteredQuestions(orderedFiltered);
            // Parse counts with proper handling for 0 (which is falsy but valid)
            const parsedMissed = storedMissedCount !== null
              ? Number.parseInt(storedMissedCount, 10)
              : NaN;
            const parsedFlagged = storedFlaggedCount !== null
              ? Number.parseInt(storedFlaggedCount, 10)
              : NaN;
            setSmartRoundData({
              questionIds,
              missedCount: Number.isNaN(parsedMissed) ? orderedFiltered.length : parsedMissed,
              flaggedCount: Number.isNaN(parsedFlagged) ? 0 : parsedFlagged,
            });
          } else {
            router.replace(`/quiz/${quizId}/zen`);
          }
        } else {
          router.replace(`/quiz/${quizId}/zen`);
        }
      } catch (error) {
        console.error("Failed to load Smart Round data:", error);
        router.replace(`/quiz/${quizId}/zen`);
      }
    }
  }, [isSmartRound, quiz, quizId, router]);

  const handleSmartRoundExit = (): void => {
    clearSmartRoundState();
    router.push("/");
  };

  if (!isInitialized || !effectiveUserId || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading quiz..." />
      </div>
    );
  }

  if (isSmartRound && !filteredQuestions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Preparing Smart Round..." />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Database Error
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {dbError.message}
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Quiz Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The quiz you&apos;re looking for doesn&apos;t exist or may have been
            deleted.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const questionsToUse =
    isSmartRound && filteredQuestions ? filteredQuestions : quiz.questions;

  if (questionsToUse.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            No Questions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSmartRound
              ? "No questions available for Smart Round."
              : "This quiz doesn't have any questions yet."}
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const quizForSession =
    isSmartRound && filteredQuestions
      ? { ...quiz, questions: filteredQuestions }
      : quiz;

  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold text-foreground">
              Something Went Wrong
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An error occurred while loading the quiz. Please try again.
            </p>
            <Button
              className="mt-6"
              onClick={() => router.push("/")}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      }
    >
      {isSmartRound && smartRoundData && (
        <div className="bg-background px-4 pt-4">
          <div className="mx-auto max-w-3xl">
            <SmartRoundBanner
              totalQuestions={smartRoundData.questionIds.length}
              missedCount={smartRoundData.missedCount}
              flaggedCount={smartRoundData.flaggedCount}
              onExit={handleSmartRoundExit}
            />
          </div>
        </div>
      )}

      <ZenQuizContainer quiz={quizForSession} isSmartRound={isSmartRound} />
    </ErrorBoundary>
  );
}
