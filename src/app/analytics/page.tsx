"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import { RecentResultsCard } from "@/components/analytics/RecentResultsCard";
import { WeakAreasCard } from "@/components/analytics/WeakAreasCard";
import { ExamReadinessCard } from "@/components/analytics/ExamReadinessCard";
import { StreakCard } from "@/components/analytics/StreakCard";
import { RetryComparisonCard } from "@/components/analytics/RetryComparisonCard";
import { TopicHeatmap } from "@/components/analytics/TopicHeatmap";
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useResults,
  useQuizzes,
  useInitializeDatabase,
} from "@/hooks/useDatabase";
import { useAnalyticsStats } from "@/hooks/useAnalyticsStats";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { useCategoryTrends } from "@/hooks/useCategoryTrends";
import { useSync } from "@/hooks/useSync";
import { type OverallStats } from "@/db/results";
import { BarChart3, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import type { Result } from "@/types/result";
import { DateRangeFilter, type DateRange, DATE_RANGE_VALUES } from "@/components/analytics/DateRangeFilter";

// Code-split recharts-heavy components for smaller initial bundle
const PerformanceHistory = dynamic(
  () => import("@/components/analytics/PerformanceHistory").then((mod) => ({ default: mod.PerformanceHistory })),
  {
    loading: () => (
      <Card className="h-[348px]">
        <Skeleton className="h-full w-full" aria-label="Loading performance chart" />
      </Card>
    ),
    ssr: false,
  }
);

const CategoryTrendChart = dynamic(
  () => import("@/components/analytics/CategoryTrendChart").then((mod) => ({ default: mod.CategoryTrendChart })),
  {
    loading: () => (
      <Card className="min-h-[380px]">
        <Skeleton className="h-full w-full" aria-label="Loading category trends" />
      </Card>
    ),
    ssr: false,
  }
);

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
  const {
    results,
    isLoading: resultsLoading,
  } = useResults(effectiveUserId ?? undefined);
  const {
    quizzes,
    isLoading: quizzesLoading,
    error: quizzesError,
  } = useQuizzes(effectiveUserId ?? undefined, true);

  // Date range filter state
  const [dateRange, setDateRange] = React.useState<DateRange>("all");

  // Load persisted date range on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("analytics-date-range");
      if (saved && DATE_RANGE_VALUES.includes(saved as DateRange)) {
        setDateRange(saved as DateRange);
      }
    } catch {
      // Safari Private Browsing or storage disabled – use default
    }
  }, []);

  const handleDateRangeChange = (range: DateRange): void => {
    setDateRange(range);
    try {
      localStorage.setItem("analytics-date-range", range);
    } catch {
      // Quota exceeded or private mode – UI state still works
    }
  };

  // Stable "now" reference to prevent hydration mismatches and impure render errors
  const [now] = React.useState(() => Date.now());

  const filteredResults = React.useMemo(() => {
    if (dateRange === "all") return results;

    const msPerDay = 24 * 60 * 60 * 1000;
    const days = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
    }[dateRange];

    const cutoff = now - days * msPerDay;
    return results.filter((r) => r.timestamp >= cutoff);
  }, [results, dateRange, now]);

  // Calculate days to track for dailyStudyTime based on date range
  const daysToTrack = React.useMemo(() => {
    const rangeDays = { "7d": 7, "30d": 30, "90d": 90, all: 14 };
    return rangeDays[dateRange];
  }, [dateRange]);

  // Human-readable label for filtered date range (used in StreakCard)
  const dateRangeLabel = React.useMemo(() => {
    const labels = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", all: "Last 14 days" };
    return labels[dateRange];
  }, [dateRange]);

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
  } = useAnalyticsStats(filteredResults, quizzes, daysToTrack);

  // Advanced analytics split:
  // 1. All-time for Streaks (streaks rely on continuous history)
  const allTimeAnalytics = useAdvancedAnalytics(results, quizzes);

  // 2. Filtered for Performance/Readiness (reflects selected time range)
  const filteredAnalytics = useAdvancedAnalytics(filteredResults, quizzes);

  // Calculate Overall Stats client-side to respect date filters.
  // This replaces the getOverallStats DB call which was always all-time.
  const clientOverallStats = React.useMemo((): OverallStats => {
    const totalAttempts = filteredResults.length;
    const totalStudyTime = filteredResults.reduce((acc, r) => acc + r.time_taken_seconds, 0);

    // Calculate average score
    const totalScore = filteredResults.reduce((acc, r) => acc + r.score, 0);
    const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;

    // Calculate weakest categories using weighted mean.
    // We weight each session's category score by the number of questions in that category,
    // so larger sample sizes have more influence. This approximates pooled-totals behavior
    // while still supporting date filtering (which raw pooled-totals can't do client-side
    // without re-grading all questions).
    const categorySums = new Map<string, { weightedSum: number; totalWeight: number }>();

    filteredResults.forEach((r) => {
      if (!r.category_breakdown) return;
      Object.entries(r.category_breakdown).forEach(([cat, score]) => {
        // Use question count as weight if available, otherwise default to 1
        const weight = r.computed_category_scores?.[cat]?.total ?? 1;
        const current = categorySums.get(cat) || { weightedSum: 0, totalWeight: 0 };
        current.weightedSum += score * weight;
        current.totalWeight += weight;
        categorySums.set(cat, current);
      });
    });

    const weakestCategories = Array.from(categorySums.entries())
      .map(([category, { weightedSum, totalWeight }]) => ({
        category,
        avgScore: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
      }))
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 5);

    return {
      totalQuizzes: quizzes.length,
      totalAttempts,
      averageScore,
      totalStudyTime,
      weakestCategories,
    };
  }, [filteredResults, quizzes.length]);

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

  if (dbError || quizzesError) {
    const message = dbError?.message ?? quizzesError?.message ?? "Unknown error";
    return (
      <div className="mx-auto min-h-[calc(100dvh-var(--header-height))] max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Failed to load analytics
          </h2>
          <p className="mt-2 text-destructive">
            {message}
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
    return (
      <AnalyticsSkeleton
        syncingText={isSyncing ? "Syncing your data..." : undefined}
      />
    );
  }

  // Only show empty state after sync has completed and we still have no results
  if (results.length === 0) {
    return (
      <div className="mx-auto min-h-[calc(100dvh-var(--header-height))] max-w-7xl px-4 py-8">
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
    <div data-testid="analytics-main" className="mx-auto min-h-[calc(100dvh-var(--header-height))] max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track your progress and identify areas for improvement
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {/* Hero: Exam Readiness (Filtered) */}
      <div className="mb-8">
        <ExamReadinessCard
          readinessScore={filteredAnalytics.readinessScore}
          readinessConfidence={filteredAnalytics.readinessConfidence}
          categoryReadiness={filteredAnalytics.categoryReadiness}
        />
      </div>

      {/* Streaks (All-time streaks, Filtered study time) */}
      <div className="mb-8">
        <StreakCard
          currentStreak={allTimeAnalytics.currentStreak}
          longestStreak={allTimeAnalytics.longestStreak}
          consistencyScore={allTimeAnalytics.consistencyScore}
          last7DaysActivity={allTimeAnalytics.last7DaysActivity}
          dailyStudyTime={dailyStudyTime}
          studyTimeRangeLabel={dateRangeLabel}
        />
      </div>

      {/* AnalyticsOverview slot - always rendered with min-h to prevent CLS */}
      <div className="mb-8 min-h-[88px]">
        <AnalyticsOverview stats={clientOverallStats} />
      </div>

      {/* Performance History Chart (full width) */}
      <div className="mb-8 h-[348px]">
        <PerformanceHistory results={filteredResults} quizTitles={quizTitles} />
      </div>

      {/* Recent Results + Focus to Improve (side-by-side) */}
      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <RecentResultsCard results={filteredResults} quizzes={quizzes} quizTitles={quizTitles} />
        <WeakAreasCard
          weakAreas={weakAreas}
          userId={effectiveUserId ?? undefined}
        />
      </div>

      {/* Topic Heatmap (full width for dense data) */}
      <div className="mb-8">
        <TopicHeatmap results={filteredResults} quizzes={quizzes} userId={effectiveUserId ?? undefined} />
      </div>

      {/* Category Trends Over Time - Uses all-time results intentionally.
          The trend line's value is showing long-term trajectory; filtering to
          short ranges would eliminate the historical context that makes trends
          meaningful. Users see dates on the X-axis for reference. */}
      <div className="min-h-[380px]">
        <CategoryTrendChartSection results={results} />
      </div>

      {/* Retry Comparison (Filtered) */}
      <div className="mb-8">
        <RetryComparisonCard
          firstAttemptAvg={filteredAnalytics.firstAttemptAvg}
          retryAvg={filteredAnalytics.retryAvg}
          avgImprovement={filteredAnalytics.avgImprovement}
        />
      </div>
    </div>
  );
}
