"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ResultsContainer } from "@/components/results/ResultsContainer";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import {
  useQuizResults,
  useInitializeDatabase,
  useResultWithHydratedQuiz,
} from "@/hooks/useDatabase";
import { deleteResult, isSRSQuiz } from "@/db/results";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, AlertCircle, AlertTriangle, Trash2, Settings } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useSync } from "@/hooks/useSync";
import { syncQuizzes } from "@/lib/sync/quizSyncManager";
import { logger } from "@/lib/logger";

/**
 * Results page integrating analytics and review.
 */
export default function ResultsPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const resultId = params.id as string;
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { isSyncing, hasInitialSyncCompleted, sync } = useSync();

  const { isInitialized, error: dbError } = useInitializeDatabase();

  const {
    result,
    quiz,
    isLoading: dataLoading,
    isHydrating,
  } = useResultWithHydratedQuiz(
    isInitialized ? resultId : undefined,
    effectiveUserId ?? undefined,
  );

  // Still needed for previousScore logic
  const quizId = result?.quiz_id;
  const { results: allQuizResults } = useQuizResults(
    quizId,
    effectiveUserId ?? undefined,
  );

  const [isRestoringQuiz, setIsRestoringQuiz] = React.useState(false);
  const [restoreAttempted, setRestoreAttempted] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteResult = async (): Promise<void> => {
    if (!effectiveUserId || !result) return;
    if (!confirm("Are you sure you want to delete this result?")) return;

    setIsDeleting(true);
    try {
      await deleteResult(result.id, effectiveUserId);
      // Trigger sync to push deletion
      const outcome = await sync();

      if (outcome.status === "success") {
        addToast("success", "Result deleted successfully");
      } else if (outcome.status === "partial") {
        addToast("info", "Result deleted, but sync was incomplete.");
      } else {
        addToast("warning", "Result deleted locally, but sync failed.");
      }

      router.push("/");
    } catch (error) {
      logger.error("Failed to delete result", error);
      addToast("error", "Failed to delete result");
    } finally {
      setIsDeleting(false);
    }
  };

  const previousScore = React.useMemo(() => {
    if (!allQuizResults || allQuizResults.length < 2 || !result) {
      return null;
    }

    const sorted = [...allQuizResults].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    const currentIndex = sorted.findIndex((r) => r.id === result.id);
    const nextResult =
      currentIndex >= 0 && currentIndex < sorted.length - 1
        ? sorted[currentIndex + 1]
        : undefined;
    if (nextResult) {
      return nextResult.score;
    }

    return null;
  }, [allQuizResults, result]);

  // Debounce restore effect to allow useLiveQuery to settle after navigation
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  React.useEffect(() => {
    // Give Dexie's useLiveQuery a moment to subscribe and return cached data
    const timer = setTimeout((): void => setInitialLoadComplete(true), 500);
    return (): void => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    // Attempt restore if:
    // 1. Result exists
    // 2. Quiz is MISSING (not even empty, but undefined) and NOT hydrating
    // 3. We haven't tried yet
    // 4. We are not currently loading
    // 5. Initial load delay has passed (avoids race with useLiveQuery)
    if (
      !result ||
      quiz ||
      isHydrating ||
      dataLoading ||
      !effectiveUserId ||
      restoreAttempted ||
      !initialLoadComplete
    ) {
      return undefined;
    }

    const restore = async (): Promise<void> => {
      setIsRestoringQuiz(true);
      try {
        await syncQuizzes(effectiveUserId);
      } catch (error) {
        logger.error("Failed to restore quiz for result view", error);
      } finally {
        if (isMounted) {
          setIsRestoringQuiz(false);
          setRestoreAttempted(true);
        }
      }
    };

    void restore();

    return (): void => {
      isMounted = false;
    };
  }, [
    effectiveUserId,
    quiz,
    result,
    restoreAttempted,
    isHydrating,
    dataLoading,
    initialLoadComplete,
  ]);

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
          <AlertCircle
            className="mx-auto h-12 w-12 text-destructive"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Database Error
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {dbError.message}
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Show loading while DB initializes, user is determined, or result is being fetched
  if (!isInitialized || !effectiveUserId || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner
          size="lg"
          text={
            isHydrating ? "Building study session..." : "Loading your results..."
          }
        />
      </div>
    );
  }

  // Wait for initial sync to complete before declaring result not found
  // This handles the case where user opens a result URL on a new browser
  if (!result && !hasInitialSyncCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner
          size="lg"
          text={isSyncing ? "Syncing your data..." : "Loading your results..."}
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <AlertCircle
            className="mx-auto h-12 w-12 text-warning"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-xl font-semibold text-foreground">
            Result Not Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This result doesn&apos;t exist or may have been deleted.
          </p>
          <Button
            className="mt-6"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Only check quiz loading when we have a result (and thus a quiz_id)
  if (dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" text="Loading quiz details..." />
      </div>
    );
  }

  // Show restoring state first
  if (isRestoringQuiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          <LoadingSpinner size="lg" text="Restoring quiz..." />
          <p className="text-sm text-muted-foreground">
            We&apos;re attempting to restore the quiz linked to this result.
          </p>
        </div>
      </div>
    );
  }

  // Render priority:
  // 1. Quiz with questions → Full ResultsContainer with question review
  // 2. No quiz or empty quiz → Simplified fallback card (hydration failed, orphaned)

  // Quiz exists and has questions (hydrated successfully or is a regular quiz)
  // Render full ResultsContainer
  if (quiz && quiz.questions.length > 0) {
    return (
      <ErrorBoundary
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
              <AlertCircle
                className="mx-auto h-12 w-12 text-destructive"
                aria-hidden="true"
              />
              <h1 className="mt-4 text-xl font-semibold text-foreground">
                Something Went Wrong
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                An error occurred while displaying your results.
              </p>
              <Button
                className="mt-6"
                onClick={() => router.push("/")}
                leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        }
      >
        {/* Missing category banner */}
        {!quiz.category && (
          <div role="status" className="mx-auto mb-4 flex max-w-4xl items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-warning" aria-hidden="true" />
            <p className="flex-1 text-sm text-foreground">
              This quiz is missing category metadata and won&apos;t appear in grouped analytics.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/quiz/${quiz.id}/settings`)}
              leftIcon={<Settings className="h-4 w-4" aria-hidden="true" />}
            >
              Add Category
            </Button>
          </div>
        )}
        <ResultsContainer
          result={result}
          quiz={quiz}
          previousScore={previousScore}
          allQuizResults={allQuizResults}
          sourceMap={result.source_map}
        />
      </ErrorBoundary>
    );
  }

  // Fallback: No quiz or quiz has no questions (hydration failed, orphaned result)
  const isAggregatedResult = isSRSQuiz(
    result.quiz_id,
    effectiveUserId,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isAggregatedResult ? "bg-success/20" : "bg-warning/20"
            }`}
        >
          {isAggregatedResult ? (
            <span className="text-2xl">🎯</span>
          ) : (
            <AlertCircle
              className="h-8 w-8 text-warning"
              aria-hidden="true"
            />
          )}
        </div>
        <h1 className="mt-4 text-xl font-semibold text-foreground">
          {isAggregatedResult ? "Study Session Complete" : "Quiz Not Found"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAggregatedResult
            ? "Great job on your focused study session!"
            : "The quiz linked to this result isn't available right now."}
        </p>

        {/* Score Display */}
        <div className="mt-4 rounded-lg bg-muted p-4">
          <p className="text-3xl font-bold text-foreground">
            {result.score}%
          </p>
          <p className="text-sm text-muted-foreground">
            {isAggregatedResult ? "Session Score" : "Your score"}
          </p>
        </div>

        {/* Category Breakdown for aggregated results */}
        {isAggregatedResult && result.category_breakdown && Object.keys(result.category_breakdown).length > 0 && (
          <div className="mt-4 space-y-2 text-left">
            <h2 className="text-sm font-medium text-foreground">Category Breakdown</h2>
            {Object.entries(result.category_breakdown).map(([category, score]) => (
              <div key={category} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{category}</span>
                <span className="font-medium text-foreground">{score}%</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <Button
            onClick={() => router.push(isAggregatedResult ? "/analytics" : "/")}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            {isAggregatedResult ? "Back to Analytics" : "Back to Dashboard"}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteResult}
            isLoading={isDeleting}
            leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          >
            Delete Result
          </Button>
        </div>
      </div>
    </div>
  );

}
