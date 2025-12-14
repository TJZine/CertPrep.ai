"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  CloudOff,
  Home,
  Printer,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import { Scorecard } from "./Scorecard";
import { TopicRadar, CategoryBreakdown } from "./TopicRadar";
import { ResultsSummary } from "./ResultsSummary";
import { QuestionReviewList, type FilterType } from "./QuestionReviewList";
import { SmartActions } from "./SmartActions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { db } from "@/db";
import { deleteResult, isSRSQuiz } from "@/db/results";
import { celebratePerfectScore } from "@/lib/confetti";
import { updateStudyStreak } from "@/lib/streaks";
import { useQuizGrading } from "@/hooks/useQuizGrading";
import { useResolveCorrectAnswers } from "@/hooks/useResolveCorrectAnswers";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import { Badge } from "@/components/ui/Badge";
import { useSync } from "@/hooks/useSync";

interface ResultsContainerProps {
  result: Result;
  quiz: Quiz;
  previousScore?: number | null;
}

/**
 * Full results page container combining score, analytics, and review.
 */
export function ResultsContainer({
  result,
  quiz,
  previousScore,
}: ResultsContainerProps): React.ReactElement {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const isQuizRemoved =
    quiz.deleted_at !== null && quiz.deleted_at !== undefined;

  const { sync } = useSync();
  const [isSyncing, setIsSyncing] = React.useState(false);

  // Live query for synced status - updates automatically when Dexie changes
  const liveSynced = useLiveQuery(
    async () => {
      const r = await db.results.get(result.id);
      return r?.synced ?? result.synced;
    },
    [result.id],
    result.synced // Default value while loading
  );

  const handleManualSync = async (): Promise<void> => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const syncResult = await sync();
      if (syncResult.success) {
        // syncManager already marks items as synced in Dexie on success
        // useLiveQuery will automatically pick up the change
        addToast("success", "Sync complete! Checking result status...");

        // Verify this specific result was synced by re-checking its status
        const updatedResult = await db.results.get(result.id);
        if (updatedResult?.synced === 1) {
          addToast("success", "Result synced successfully!");
        } else {
          // Result wasn't synced in this batch (edge case)
          addToast("info", "Sync completed but this result may need another sync.");
        }
      } else {
        addToast("error", "Sync failed. Please check your connection.");
      }
    } catch {
      addToast("error", "Sync failed. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const {
    grading,
    isLoading: gradingLoading,
    error: gradingError,
  } = useQuizGrading(quiz, result.answers, result.question_ids);
  const {
    resolvedAnswers,
    isResolving,
    error: resolvingError,
  } = useResolveCorrectAnswers(quiz.questions);

  // Questions actually included in this session (subset for Smart Round/Review Missed)
  const scopedQuestions = React.useMemo(() => {
    if (!result.question_ids) return quiz.questions;
    const idSet = new Set(result.question_ids);
    return quiz.questions.filter((q) => idSet.has(q.id));
  }, [quiz.questions, result.question_ids]);

  // Detect if this is an SRS/Topic Study result and compute display title
  const isAggregatedResult = isSRSQuiz(quiz.id);
  const displayTitle = React.useMemo(() => {
    if (!isAggregatedResult) return quiz.title;
    // For SRS results, try to get a meaningful title from category breakdown
    const categories = Object.keys(result.category_breakdown ?? {});
    if (categories.length === 1) {
      return `Topic Study: ${categories[0]}`;
    }
    if (categories.length > 1) {
      return "Study Session";
    }
    return "Study Session";
  }, [isAggregatedResult, quiz.title, result.category_breakdown]);

  // Get the effective question count - use result.question_ids for SRS results
  // since quiz.questions is empty for the SRS quiz
  const sessionQuestionCount = React.useMemo(() => {
    if (isAggregatedResult && result.question_ids?.length) {
      return result.question_ids.length;
    }
    return scopedQuestions.length;
  }, [isAggregatedResult, result.question_ids, scopedQuestions.length]);

  const stats = React.useMemo(() => {
    if (!grading) return null;

    return {
      correctCount: grading.correctCount,
      incorrectCount: grading.incorrectCount,
      unansweredCount: grading.unansweredCount,
      answeredCount: grading.correctCount + grading.incorrectCount,
      averageTimePerQuestion:
        sessionQuestionCount > 0
          ? result.time_taken_seconds / sessionQuestionCount
          : 0,
    };
  }, [grading, result.time_taken_seconds, sessionQuestionCount]);

  const categoryScores = React.useMemo(() => {
    if (!grading) return [];

    const categories = new Map<string, { correct: number; total: number }>();

    scopedQuestions.forEach((q) => {
      if (!categories.has(q.category)) {
        categories.set(q.category, { correct: 0, total: 0 });
      }

      const cat = categories.get(q.category)!;
      cat.total += 1;

      if (grading.questionStatus[q.id] === true) {
        cat.correct += 1;
      }
    });

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      score: Math.round((data.correct / data.total) * 100),
      correct: data.correct,
      total: data.total,
    }));
  }, [scopedQuestions, grading]);

  const questionsWithAnswers = React.useMemo(() => {
    if (!grading) return [];

    return scopedQuestions.map((q) => ({
      question: q,
      userAnswer: result.answers[q.id] || null,
      isCorrect: grading.questionStatus[q.id] === true,
      isFlagged: result.flagged_questions.includes(q.id),
      correctAnswer: resolvedAnswers[q.id] || null,
    }));
  }, [scopedQuestions, result, grading, resolvedAnswers]);

  const missedQuestions = React.useMemo(() => {
    if (!grading) return [];

    if (isResolving) {
      return [];
    }

    return scopedQuestions
      .filter(
        (q) => grading.questionStatus[q.id] !== true && result.answers[q.id],
      ) // Incorrect and answered
      .map((q) => ({
        question: q,
        userAnswer: result.answers[q.id] || null,
        correctAnswer: resolvedAnswers[q.id] || null, // Use null instead of string fallback
      }));
  }, [scopedQuestions, result, grading, resolvedAnswers, isResolving]);

  const hasMissedQuestions = React.useMemo(
    () => missedQuestions.length > 0,
    [missedQuestions.length],
  );

  const [questionFilter, setQuestionFilter] = React.useState<FilterType>("all");
  const [autoFilterApplied, setAutoFilterApplied] = React.useState(false);

  // Update filter once grading is done
  React.useEffect(() => {
    if (
      !gradingLoading &&
      hasMissedQuestions &&
      !autoFilterApplied
    ) {
      setQuestionFilter("incorrect");
      setAutoFilterApplied(true);
      addToast(
        "info",
        "Showing incorrect answers to help you focus on areas to improve.",
      );
    }
  }, [gradingLoading, hasMissedQuestions, autoFilterApplied, addToast]);

  const handleFilterChange = (filter: FilterType): void => {
    setAutoFilterApplied(true);
    setQuestionFilter(filter);
  };

  const handleRetakeQuiz = (): void => {
    if (isQuizRemoved) {
      addToast("info", "This quiz was removed. Restore it before retaking.");
      return;
    }
    router.push(`/quiz/${quiz.id}/${result.mode}`);
  };

  const handleBackToDashboard = (): void => {
    router.push("/");
  };

  const handleDeleteResult = async (): Promise<void> => {
    if (!effectiveUserId) {
      addToast("error", "Unable to delete result: missing user context.");
      return;
    }

    setIsDeleting(true);

    try {
      await deleteResult(result.id, effectiveUserId);
      addToast("success", "Result deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Failed to delete result:", error);
      addToast("error", "Failed to delete result");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      addToast("success", "Result copied to clipboard!");
    } catch {
      addToast("error", "Failed to copy");
    }
  };

  const handleShare = async (): Promise<void> => {
    const shareText = `I scored ${result.score}% on "${quiz.title}" using CertPrep.ai! 🎯`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Quiz Result",
          text: shareText,
        });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
      }
    }

    await copyToClipboard(shareText);
  };

  const handlePrint = (): void => {
    window.print();
  };

  React.useEffect(() => {
    if (result.score === 100) {
      celebratePerfectScore();
    }
    updateStudyStreak();
  }, [result.score]);

  if (gradingError || resolvingError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load results
          </h2>
          <p className="mt-2 text-muted-foreground">
            {gradingError?.message ||
              resolvingError?.message ||
              "An unexpected error occurred."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              leftIcon={<Home className="h-4 w-4" />}
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {gradingLoading || !stats ? (
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner size="lg" text="Calculating results..." />
        </div>
      ) : (
        <>
          <header className="no-print sticky top-0 z-40 border-b border-border bg-card">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => router.back()}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
                <div>
                  <h1 className="line-clamp-1 text-sm font-semibold text-foreground">
                    {displayTitle}
                  </h1>
                  <div className="flex items-center gap-2">

                    <p className="text-xs text-muted-foreground">
                      Results
                    </p>
                    {liveSynced === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="h-auto p-0 hover:bg-transparent"
                        title="Click to retry sync"
                      >
                        <Badge variant="warning" className="gap-1 text-xs cursor-pointer hover:bg-warning/80">
                          {isSyncing ? (
                            <LoadingSpinner size="sm" className="h-3 w-3" />
                          ) : (
                            <CloudOff className="h-3 w-3" />
                          )}
                          {isSyncing ? "Syncing..." : "Unsynced"}
                        </Badge>
                      </Button>
                    )}
                    {isQuizRemoved && (
                      <Badge variant="secondary" className="text-xs">
                        Removed quiz
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  leftIcon={<Share2 className="h-4 w-4" aria-hidden="true" />}
                >
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  leftIcon={<Printer className="h-4 w-4" aria-hidden="true" />}
                >
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete result"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="no-print mb-8 flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleBackToDashboard}
                leftIcon={<Home className="h-4 w-4" aria-hidden="true" />}
              >
                Dashboard
              </Button>
              <Button
                onClick={handleRetakeQuiz}
                leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                disabled={isQuizRemoved}
                title={
                  isQuizRemoved
                    ? "This quiz was removed. Restore it before retaking."
                    : undefined
                }
              >
                Retake Quiz
              </Button>
            </div>
            {isQuizRemoved && (
              <p className="mb-6 text-sm text-warning">
                This quiz has been removed. Restore it from your dashboard
                before retaking or editing.
              </p>
            )}

            <Scorecard
              score={result.score}
              previousScore={previousScore}
              correctCount={stats.correctCount}
              totalCount={sessionQuestionCount}
              timeTakenSeconds={result.time_taken_seconds}
              mode={result.mode}
              timestamp={result.timestamp}
              className="mb-8"
            />

            <div className="mb-8 grid gap-8 lg:grid-cols-2">
              <TopicRadar categories={categoryScores} />
              <ResultsSummary
                score={result.score}
                correctCount={stats.correctCount}
                incorrectCount={stats.incorrectCount}
                unansweredCount={stats.unansweredCount}
                flaggedCount={result.flagged_questions.length}
                totalQuestions={sessionQuestionCount}
                timeTakenSeconds={result.time_taken_seconds}
                mode={result.mode}
                averageTimePerQuestion={stats.averageTimePerQuestion}
              />
            </div>

            <div className="mb-8 lg:hidden">
              <CategoryBreakdown categories={categoryScores} />
            </div>

            <SmartActions
              quizId={quiz.id}
              quizTitle={quiz.title}
              missedQuestions={missedQuestions}
              flaggedQuestionIds={result.flagged_questions}
              allQuestions={quiz.questions}
              onReviewMissed={() => handleFilterChange("incorrect")}
              className="mb-8 no-print"
            />

            <div id="question-review" className="print-break">
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Question Review
              </h2>
              <QuestionReviewList
                questions={questionsWithAnswers}
                filter={questionFilter}
                onFilterChange={handleFilterChange}
                isResolving={isResolving}
              />
            </div>
          </main>

          <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete Result"
            description="This action cannot be undone."
            size="sm"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteResult}
                  isLoading={isDeleting}
                >
                  Delete
                </Button>
              </>
            }
          >
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this result? Your score and
              answers will be permanently removed.
            </p>
            <div className="mt-1 text-sm text-muted-foreground">
              Score: {result.score}%
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
