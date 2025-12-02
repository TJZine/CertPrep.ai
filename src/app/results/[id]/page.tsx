'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ResultsContainer } from '@/components/results/ResultsContainer';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui/Button';
import { useResult, useQuiz, useQuizResults, useInitializeDatabase } from '@/hooks/useDatabase';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId';
import { syncQuizzes } from '@/lib/sync/quizSyncManager';
import { logger } from '@/lib/logger';

/**
 * Results page integrating analytics and review.
 */
export default function ResultsPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const resultId = params.id as string;
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { result, isLoading: resultLoading } = useResult(isInitialized ? resultId : undefined, effectiveUserId ?? undefined);
  const { quiz, isLoading: quizLoading } = useQuiz(result?.quiz_id, effectiveUserId ?? undefined);
  const { results: allQuizResults } = useQuizResults(result?.quiz_id, effectiveUserId ?? undefined);
  const [isRestoringQuiz, setIsRestoringQuiz] = React.useState(false);
  const [restoreAttempted, setRestoreAttempted] = React.useState(false);

  const previousScore = React.useMemo(() => {
    if (!allQuizResults || allQuizResults.length < 2 || !result) {
      return null;
    }

    const sorted = [...allQuizResults].sort((a, b) => b.timestamp - a.timestamp);
    const currentIndex = sorted.findIndex((r) => r.id === result.id);
    const nextResult = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : undefined;
    if (nextResult) {
      return nextResult.score;
    }

    return null;
  }, [allQuizResults, result]);

  React.useEffect(() => {
    let isMounted = true;
    if (!result || quiz || !effectiveUserId || restoreAttempted) {
      return undefined;
    }

    const restore = async (): Promise<void> => {
      setIsRestoringQuiz(true);
      try {
        await syncQuizzes(effectiveUserId);
      } catch (error) {
        logger.error('Failed to restore quiz for result view', error);
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
  }, [effectiveUserId, quiz, result, restoreAttempted]);

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-500/60 dark:bg-red-950">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-200" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">Database Error</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">{dbError.message}</p>
          <Button className="mt-6" onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!isInitialized || !effectiveUserId || resultLoading || quizLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="lg" text="Loading your results..." />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">Result Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This result doesn&apos;t exist or may have been deleted.</p>
          <Button className="mt-6" onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    if (isRestoringQuiz) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <LoadingSpinner size="lg" text="Restoring quiz..." />
            <p className="text-sm text-slate-600 dark:text-slate-300">We&apos;re attempting to restore the quiz linked to this result.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" aria-hidden="true" />
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">Quiz Not Found</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The quiz linked to this result isn&apos;t available right now. Your score is preserved below.
          </p>
          <div className="mt-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-200">
              Your score was: <span className="font-bold text-slate-900 dark:text-slate-50">{result.score}%</span>
            </p>
          </div>
          <Button className="mt-6" onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm dark:border-red-500/60 dark:bg-red-950">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 dark:text-red-200" aria-hidden="true" />
            <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-50">Something Went Wrong</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-200">An error occurred while displaying your results.</p>
            <Button className="mt-6" onClick={() => router.push('/')} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      }
    >
      <ResultsContainer result={result} quiz={quiz} previousScore={previousScore} />
    </ErrorBoundary>
  );
}
