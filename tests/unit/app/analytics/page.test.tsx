import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AnalyticsPage from "@/app/analytics/page";
import type { Result } from "@/types/result";

function createMockResult(overrides: Partial<Result>): Result {
  return {
    id: overrides.id ?? "result-1",
    quiz_id: overrides.quiz_id ?? "q1",
    user_id: overrides.user_id ?? "test-user",
    timestamp: overrides.timestamp ?? Date.UTC(2024, 3, 15, 12, 0, 0),
    mode: overrides.mode ?? "proctor",
    score: overrides.score ?? 80,
    time_taken_seconds: overrides.time_taken_seconds ?? 120,
    answers: overrides.answers ?? {},
    flagged_questions: overrides.flagged_questions ?? [],
    category_breakdown: overrides.category_breakdown ?? { Frontend: 80 },
    ...overrides,
  };
}

function createAnalyticsResults(
  latestFrontendScore: number,
): Result[] {
  return [
    createMockResult({
      id: "result-newest",
      timestamp: Date.UTC(2024, 3, 15, 12, 0, 0),
      score: latestFrontendScore,
      category_breakdown: { Frontend: latestFrontendScore },
    }),
    createMockResult({
      id: "result-oldest",
      timestamp: Date.UTC(2024, 3, 1, 12, 0, 0),
      score: 60,
      category_breakdown: { Frontend: 60 },
    }),
  ];
}

let mockResults: Result[] = createAnalyticsResults(40);

const mockUseResults = vi.fn(() => ({
  results: mockResults,
  isLoading: false,
  error: null,
}));

// Mock the components used in the page
vi.mock("@/components/analytics/AnalyticsOverview", () => ({
  AnalyticsOverview: (): React.ReactElement => (
    <div data-testid="analytics-overview" />
  ),
}));

vi.mock("@/components/analytics/PerformanceHistory", () => ({
  PerformanceHistory: (): React.ReactElement => (
    <div data-testid="performance-history" />
  ),
}));

vi.mock("@/components/analytics/TopicHeatmap", () => ({
  TopicHeatmap: (): React.ReactElement => <div data-testid="topic-heatmap" />,
}));

vi.mock("@/components/analytics/WeakAreasCard", () => ({
  WeakAreasCard: (): React.ReactElement => (
    <div data-testid="weak-areas-card" />
  ),
}));

vi.mock("@/components/analytics/ExamReadinessCard", () => ({
  ExamReadinessCard: (): React.ReactElement => (
    <div data-testid="exam-readiness-card" />
  ),
}));

vi.mock("@/components/analytics/StreakCard", () => ({
  StreakCard: (): React.ReactElement => <div data-testid="streak-card" />,
}));

vi.mock("@/components/analytics/CategoryTrendChart", () => ({
  CategoryTrendChart: ({
    data,
    categories,
  }: {
    data: Array<Record<string, number | string>>;
    categories: string[];
  }): React.ReactElement => {
    const latestPoint = data[data.length - 1];

    return (
      <div data-testid="category-trend-chart">
        <div data-testid="category-trend-categories">
          {categories.join(",")}
        </div>
        <div data-testid="trend-latest-frontend">
          {latestPoint?.Frontend ?? ""}
        </div>
      </div>
    );
  },
}));

vi.mock("@/components/analytics/RecentResultsCard", () => ({
  RecentResultsCard: (): React.ReactElement => (
    <div data-testid="recent-results-card" />
  ),
}));

vi.mock("@/components/analytics/RetryComparisonCard", () => ({
  RetryComparisonCard: (): React.ReactElement => (
    <div data-testid="retry-comparison-card" />
  ),
}));

vi.mock("@/components/analytics/DateRangeFilter", () => ({
  DateRangeFilter: (): React.ReactElement => (
    <div data-testid="date-range-filter" />
  ),
}));

vi.mock("@/hooks/useAdvancedAnalytics", () => ({
  useAdvancedAnalytics: vi.fn(() => ({
    readinessScore: 85,
    readinessConfidence: "medium",
    categoryReadiness: [],
    currentStreak: 5,
    longestStreak: 10,
    consistencyScore: 80,
    last7DaysActivity: [],
    firstAttemptAvg: 70,
    retryAvg: 80,
    avgImprovement: 10,
  })),
}));

vi.mock("@/hooks/useAnalyticsStats", () => ({
  useAnalyticsStats: vi.fn(() => ({
    weakAreas: [],
    dailyStudyTime: [],
    isLoading: false,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user" } })),
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: vi.fn(() => ({
    isSyncing: false,
    hasInitialSyncCompleted: true,
  })),
}));

vi.mock("@/hooks/useDatabase", () => ({
  useResults: (): ReturnType<typeof mockUseResults> => mockUseResults(),
  useQuizzes: vi.fn(() => ({
    quizzes: [{ id: "q1", title: "Test Quiz" }],
    isLoading: false,
    error: null,
  })),
  useInitializeDatabase: vi.fn(() => ({
    isInitialized: true,
    error: null,
  })),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: vi.fn(() => "test-user"),
}));

describe("AnalyticsPage", () => {
  beforeEach(() => {
    mockResults = createAnalyticsResults(40);
    mockUseResults.mockClear();
    window.localStorage.clear();
  });

  it("renders all analytics components when loaded", async () => {
    render(<AnalyticsPage />);

    expect(screen.getByTestId("analytics-overview")).toBeInTheDocument();
    expect(screen.getByTestId("topic-heatmap")).toBeInTheDocument();
    expect(screen.getByTestId("weak-areas-card")).toBeInTheDocument();
    expect(screen.getByTestId("exam-readiness-card")).toBeInTheDocument();
    expect(screen.getByTestId("streak-card")).toBeInTheDocument();
    expect(screen.getByTestId("recent-results-card")).toBeInTheDocument();
    expect(screen.getByTestId("retry-comparison-card")).toBeInTheDocument();
    expect(screen.getByTestId("date-range-filter")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("performance-history")).toBeInTheDocument();
      expect(screen.getByTestId("category-trend-chart")).toBeInTheDocument();
    });
  });

  it("refreshes category trends when result content changes without changing length or oldest timestamp", async () => {
    const { rerender } = render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-latest-frontend").textContent).toBe(
        "40",
      );
    });

    mockResults = createAnalyticsResults(95);
    rerender(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-latest-frontend").textContent).toBe(
        "95",
      );
    });
  });
});
