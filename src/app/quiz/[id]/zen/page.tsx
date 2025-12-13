"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { SessionBanner } from "@/components/quiz/SessionBanner";
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
import {
  clearTopicStudyState,
  TOPIC_STUDY_QUESTIONS_KEY,
  TOPIC_STUDY_QUIZ_ID_KEY,
  TOPIC_STUDY_CATEGORY_KEY,
  TOPIC_STUDY_MISSED_COUNT_KEY,
  TOPIC_STUDY_FLAGGED_COUNT_KEY,
} from "@/lib/topicStudyStorage";
import {
  clearSRSReviewState,
  SRS_REVIEW_QUESTIONS_KEY,
  SRS_REVIEW_QUIZ_ID_KEY,
} from "@/lib/srsReviewStorage";

type StudyMode = "smart" | "topic" | "srs-review" | null;

interface StudyModeData {
  questionIds: string[];
  missedCount: number;
  flaggedCount: number;
  category?: string;
}

/**
 * Page entry for Zen mode quizzes with Smart Round and Topic Study support.
 */
export default function ZenModePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quizId = params.id as string;

  const rawMode = searchParams.get("mode");
  const mode: StudyMode =
    rawMode === "smart" || rawMode === "topic" || rawMode === "srs-review"
      ? (rawMode as StudyMode)
      : null;

  const isSmartRound = mode === "smart";
  const isTopicStudy = mode === "topic";
  const isSRSReview = mode === "srs-review";
  const isFilteredMode = isSmartRound || isTopicStudy || isSRSReview;

  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { quiz, isLoading } = useQuiz(
    isInitialized ? quizId : undefined,
    effectiveUserId ?? undefined,
  );

  const [studyModeData, setStudyModeData] =
    React.useState<StudyModeData | null>(null);
  const [filteredQuestions, setFilteredQuestions] = React.useState<
    Question[] | null
  >(null);

  React.useEffect(() => {
    if (!isFilteredMode || !quiz) return;

    // SSR guard: sessionStorage is only available in browser
    if (typeof window === "undefined") return;

    try {
      // Determine which storage keys to use based on mode
      let questionsKey: string;
      let quizIdKey: string;
      let missedKey: string | null = null;
      let flaggedKey: string | null = null;

      if (isSmartRound) {
        questionsKey = SMART_ROUND_QUESTIONS_KEY;
        quizIdKey = SMART_ROUND_QUIZ_ID_KEY;
        missedKey = SMART_ROUND_MISSED_COUNT_KEY;
        flaggedKey = SMART_ROUND_FLAGGED_COUNT_KEY;
      } else if (isTopicStudy) {
        questionsKey = TOPIC_STUDY_QUESTIONS_KEY;
        quizIdKey = TOPIC_STUDY_QUIZ_ID_KEY;
        missedKey = TOPIC_STUDY_MISSED_COUNT_KEY;
        flaggedKey = TOPIC_STUDY_FLAGGED_COUNT_KEY;
      } else {
        // SRS review mode
        questionsKey = SRS_REVIEW_QUESTIONS_KEY;
        quizIdKey = SRS_REVIEW_QUIZ_ID_KEY;
      }

      const storedQuestionIds = sessionStorage.getItem(questionsKey);
      const storedQuizId = sessionStorage.getItem(quizIdKey);
      const storedMissedCount = missedKey ? sessionStorage.getItem(missedKey) : null;
      const storedFlaggedCount = flaggedKey ? sessionStorage.getItem(flaggedKey) : null;
      const storedCategory = isTopicStudy
        ? sessionStorage.getItem(TOPIC_STUDY_CATEGORY_KEY)
        : undefined;


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
          setStudyModeData({
            questionIds,
            missedCount: Number.isNaN(parsedMissed) ? orderedFiltered.length : parsedMissed,
            flaggedCount: Number.isNaN(parsedFlagged) ? 0 : parsedFlagged,
            category: storedCategory ?? undefined,
          });
        } else {
          router.replace(`/quiz/${quizId}/zen`);
        }
      } else {
        router.replace(`/quiz/${quizId}/zen`);
      }
    } catch (error) {
      console.error(`Failed to load ${mode} mode data:`, error);
      router.replace(`/quiz/${quizId}/zen`);
    }
  }, [isFilteredMode, isSmartRound, isTopicStudy, isSRSReview, mode, quiz, quizId, router]);

  const handleModeExit = (): void => {
    if (isSmartRound) {
      clearSmartRoundState();
    } else if (isTopicStudy) {
      clearTopicStudyState();
    } else if (isSRSReview) {
      clearSRSReviewState();
    }
    router.push(isSRSReview ? "/study-due" : "/");
  };

  if (!isInitialized || !effectiveUserId || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading quiz..." />
      </div>
    );
  }

  if (isFilteredMode && !filteredQuestions) {
    let loadingText = "Preparing questions...";
    if (isSmartRound) {
      loadingText = "Preparing Smart Round...";
    } else if (isTopicStudy) {
      loadingText = "Preparing Topic Study...";
    } else if (isSRSReview) {
      loadingText = "Preparing SRS Review...";
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text={loadingText} />
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
    isFilteredMode && filteredQuestions ? filteredQuestions : quiz.questions;

  if (questionsToUse.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-warning" />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            No Questions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isFilteredMode
              ? `No questions available for ${isSmartRound ? "Smart Round" : isTopicStudy ? "Topic Study" : "SRS Review"}.`
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
    isFilteredMode && filteredQuestions
      ? { ...quiz, questions: filteredQuestions }
      : quiz;

  // Build banner title based on mode
  const getBannerTitle = (): string => {
    if (isSRSReview) {
      return "SRS Review";
    }
    if (isTopicStudy && studyModeData?.category) {
      return `Topic Study: ${studyModeData.category}`;
    }
    return "Smart Round";
  };

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
      {isFilteredMode && studyModeData && (
        <div className="bg-background px-4 pt-4">
          <div className="mx-auto max-w-3xl">
            <SessionBanner
              totalQuestions={studyModeData.questionIds.length}
              missedCount={studyModeData.missedCount}
              flaggedCount={studyModeData.flaggedCount}
              onExit={handleModeExit}
              title={getBannerTitle()}
            />
          </div>
        </div>
      )}

      <ZenQuizContainer
        quiz={quizForSession}
        isSmartRound={isSmartRound}
        isSRSReview={isSRSReview}
      />
    </ErrorBoundary>
  );
}
