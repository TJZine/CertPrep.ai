"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AnalyticsOverview,
  ScoreDistribution,
  StudyTimeChart,
} from "@/components/analytics/AnalyticsOverview";
import { PerformanceHistory } from "@/components/analytics/PerformanceHistory";
import { WeakAreasCard } from "@/components/analytics/WeakAreasCard";
import { CategoryBreakdown } from "@/components/results/TopicRadar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  useResults,
  useQuizzes,
  useInitializeDatabase,
} from "@/hooks/useDatabase";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import { useSync } from "@/hooks/useSync";
import { getOverallStats, type OverallStats } from "@/db/results";
import { BarChart3, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Analytics dashboard aggregating results across quizzes.
 */
export default function AnalyticsPage(): React.ReactElement {
  const router = useRouter();
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId(user?.id);
  const { isSyncing, hasInitialSyncCompleted } = useSync();

  const { isInitialized, error: dbError } = useInitializeDatabase();
  const { results, isLoading: resultsLoading } = useResults(
    effectiveUserId ?? undefined,
  );
  const { quizzes, isLoading: quizzesLoading } = useQuizzes(
    effectiveUserId ?? undefined,
  );

  const [overallStats, setOverallStats] = React.useState<OverallStats | null>(
    null,
  );
  const [statsError, setStatsError] = React.useState<string | null>(null);

  React.useEffect((): void | (() => void) => {
    if (!isInitialized) return undefined;

    let isMounted = true;
    const loadStats = async (): Promise<void> => {
      try {
        const stats = effectiveUserId
          ? await getOverallStats(effectiveUserId)
          : null;
        if (isMounted) {
          setOverallStats(stats);
          setStatsError(null);
        }
      } catch (error) {
        console.error("Failed to load overall stats", error);
        if (isMounted) {
          setStatsError("Unable to load overall stats right now.");
        }
      }
    };

    loadStats();

    return (): void => {
      isMounted = false;
    };
  }, [effectiveUserId, isInitialized, results]);

  const quizTitles = React.useMemo(() => {
    const map = new Map<string, string>();
    quizzes.forEach((q) =>
      map.set(q.id, q.deleted_at ? `${q.title} (removed)` : q.title),
    );
    return map;
  }, [quizzes]);

  const {
    categoryPerformance,
    weakAreas,
    dailyStudyTime,
    isLoading: statsLoading,
  } = useAnalyticsStats(results, quizzes);

  // Show loading while initializing database, fetching data, or during initial sync
  const isLoadingData =
    !isInitialized ||
    resultsLoading ||
    quizzesLoading ||
    statsLoading ||
    !effectiveUserId;
  const isWaitingForSync = !hasInitialSyncCompleted && results.length === 0;

  if (isLoadingData || isWaitingForSync) {
    const loadingText = isSyncing
      ? "Syncing your data..."
      : "Loading analytics...";
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" text={loadingText} />
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/60 dark:bg-red-950">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-100">
            Failed to load analytics
          </h2>
          <p className="mt-2 text-red-600 dark:text-red-200">
            {dbError.message}
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/")}
            leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Only show empty state after sync has completed and we still have no results
  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-slate-50">
          Analytics
        </h1>

        <EmptyState
          icon={<BarChart3 className="h-12 w-12" aria-hidden="true" />}
          title="No Data Yet"
          description="Complete some quizzes to see your performance analytics and track your progress over time."
          action={
            <Button
              onClick={() => router.push("/")}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Start a Quiz
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
          Analytics
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-300">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {statsError && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-300">
          {statsError}
        </p>
      )}
      {overallStats && (
        <AnalyticsOverview stats={overallStats} className="mb-8" />
      )}

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <ScoreDistribution results={results} />
        <StudyTimeChart dailyData={dailyStudyTime} />
      </div>

      <div className="mb-8">
        <PerformanceHistory results={results} quizTitles={quizTitles} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <CategoryBreakdown categories={categoryPerformance} />
        <WeakAreasCard
          weakAreas={weakAreas}
          onStudyArea={() => {
            // Future enhancement: start a filtered practice session for this category.
          }}
        />
      </div>
    </div>
  );
}
