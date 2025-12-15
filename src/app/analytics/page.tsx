"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { PerformanceHistory } from "@/components/analytics/PerformanceHistory";
import { WeakAreasCard } from "@/components/analytics/WeakAreasCard";
import { ExamReadinessCard } from "@/components/analytics/ExamReadinessCard";
import { StreakCard } from "@/components/analytics/StreakCard";
import { RetryComparisonCard } from "@/components/analytics/RetryComparisonCard";
import { TopicHeatmap } from "@/components/analytics/TopicHeatmap";
import { CategoryTrendChart } from "@/components/analytics/CategoryTrendChart";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  useResults,
  useQuizzes,
  useInitializeDatabase,
} from "@/hooks/useDatabase";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { useCategoryTrends } from "@/hooks/useCategoryTrends";
import { useSync } from "@/hooks/useSync";
import { getOverallStats, type OverallStats } from "@/db/results";
import { BarChart3, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import type { Result } from "@/types/result";

/**
 * Wrapper component for CategoryTrendChart that uses the trend hook.
 * Memoizes results input to prevent unnecessary recalculations when
 * only referential identity changes (e.g., during sync operations).
 */
function CategoryTrendChartSection({
  results,
}: {
  results: Result[];
}): React.ReactElement {
  // Stabilize results identity using length + timestamp of most recent result
  // This prevents useCategoryTrends from recalculating when array identity
  // changes but actual data hasn't (common during sync operations)
  const stabilizedResults = React.useMemo(
    () => results,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.length, results[results.length - 1]?.timestamp ?? 0]
  );

  const { trendData, categories } = useCategoryTrends(stabilizedResults);

  return (
    <div className="mb-8">
      <CategoryTrendChart data={trendData} categories={categories} />
    </div>
  );
}

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

    // Debounce the stats calculation to prevent UI freezing during rapid updates (e.g., syncing)
    const timeoutId = setTimeout(() => {
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
    }, 500);

    return (): void => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // Use results.length to trigger reload when results change without causing
    // infinite loops from referential identity changes during sync operations.
  }, [effectiveUserId, isInitialized, results.length]);



  const quizTitles = React.useMemo(() => {
    const map = new Map<string, string>();
    quizzes.forEach((q) =>
      map.set(q.id, q.deleted_at ? `${q.title} (removed)` : q.title),
    );
    return map;
  }, [quizzes]);

  const {
    weakAreas,
    dailyStudyTime,
    isLoading: statsLoading,
  } = useAnalyticsStats(results, quizzes);

  const advancedAnalytics = useAdvancedAnalytics(results, quizzes);

  // Show loading while initializing database or during hydration (effectiveUserId is null).
  // Once hydrated (effectiveUserId assigned for guest or authenticated user), wait for data to load.
  const isLoadingData =
    !isInitialized ||
    effectiveUserId === null ||
    (Boolean(effectiveUserId) &&
      (resultsLoading || quizzesLoading || statsLoading));

  const isWaitingForSync =
    !!user &&
    effectiveUserId &&
    !hasInitialSyncCompleted &&
    results.length === 0 &&
    isSyncing;

  if (dbError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load analytics
          </h2>
          <p className="mt-2 text-destructive">
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

  // Only show empty state after sync has completed and we still have no results
  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
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
        <h1 className="text-3xl font-bold text-foreground">
          Analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          Track your progress and identify areas for improvement
        </p>
      </div>

      {statsError && (
        <p className="mb-4 text-sm text-destructive">
          {statsError}
        </p>
      )}
      {/* Hero: Exam Readiness */}
      <div className="mb-8">
        <ExamReadinessCard
          readinessScore={advancedAnalytics.readinessScore}
          readinessConfidence={advancedAnalytics.readinessConfidence}
          categoryReadiness={advancedAnalytics.categoryReadiness}
        />
      </div>

      {/* Streaks (includes 7-day study activity) */}
      <div className="mb-8">
        <StreakCard
          currentStreak={advancedAnalytics.currentStreak}
          longestStreak={advancedAnalytics.longestStreak}
          consistencyScore={advancedAnalytics.consistencyScore}
          last7DaysActivity={advancedAnalytics.last7DaysActivity}
          dailyStudyTime={dailyStudyTime}
        />
      </div>

      {overallStats && (
        <AnalyticsOverview stats={overallStats} className="mb-8" />
      )}

      <div className="mb-8">
        <PerformanceHistory results={results} quizTitles={quizTitles} />
      </div>

      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <TopicHeatmap results={results} quizzes={quizzes} userId={effectiveUserId ?? undefined} />
        <WeakAreasCard
          weakAreas={weakAreas}
          userId={effectiveUserId ?? undefined}
        />
      </div>

      {/* Category Trends Over Time */}
      <CategoryTrendChartSection results={results} />

      {/* Retry Comparison */}
      <div className="mb-8">
        <RetryComparisonCard
          firstAttemptAvg={advancedAnalytics.firstAttemptAvg}
          retryAvg={advancedAnalytics.retryAvg}
          avgImprovement={advancedAnalytics.avgImprovement}
        />
      </div>
    </div>
  );
}
