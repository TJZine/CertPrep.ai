import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AnalyticsPage from "@/app/analytics/page";

// Mock the components used in the page
vi.mock("@/components/analytics/AnalyticsOverview", () => ({
  AnalyticsOverview: (): React.ReactElement => <div data-testid="analytics-overview" />
}));

vi.mock("@/components/analytics/PerformanceHistory", () => ({
  PerformanceHistory: (): React.ReactElement => <div data-testid="performance-history" />
}));

vi.mock("@/components/analytics/TopicHeatmap", () => ({
  TopicHeatmap: (): React.ReactElement => <div data-testid="topic-heatmap" />
}));

vi.mock("@/components/analytics/WeakAreasCard", () => ({
  WeakAreasCard: (): React.ReactElement => <div data-testid="weak-areas-card" />
}));

vi.mock("@/components/analytics/ExamReadinessCard", () => ({
  ExamReadinessCard: (): React.ReactElement => <div data-testid="exam-readiness-card" />
}));

vi.mock("@/components/analytics/StreakCard", () => ({
  StreakCard: (): React.ReactElement => <div data-testid="streak-card" />
}));

vi.mock("@/components/analytics/CategoryTrendChart", () => ({
  CategoryTrendChart: (): React.ReactElement => <div data-testid="category-trend-chart" />
}));

vi.mock("@/components/analytics/RecentResultsCard", () => ({
  RecentResultsCard: (): React.ReactElement => <div data-testid="recent-results-card" />
}));

vi.mock("@/components/analytics/RetryComparisonCard", () => ({
  RetryComparisonCard: (): React.ReactElement => <div data-testid="retry-comparison-card" />
}));

vi.mock("@/components/analytics/DateRangeFilter", () => ({
  DateRangeFilter: (): React.ReactElement => <div data-testid="date-range-filter" />
}));

vi.mock("@/hooks/useAdvancedAnalytics", () => ({
  useAdvancedAnalytics: vi.fn(() => ({
    stats: {
      totalQuizzes: 10,
      totalQuestions: 100,
      averageScore: 85,
    },
    history: [],
    weakAreas: [],
    recentResults: [],
    categoryTrends: [],
    categoryScores: {},
    retryComparisons: [],
    isLoading: false,
    error: null,
  }))
}));

vi.mock("@/hooks/useDashboardStats", () => ({
  useDashboardStats: vi.fn(() => ({
    streakData: { currentStreak: 5, lastActivityDate: new Date().toISOString(), highestStreak: 10 },
    stats: {
      quizzesTaken: 10,
      averageScore: 85,
      questionsAnswered: 100,
    },
    isLoading: false,
    refreshStats: vi.fn(),
  }))
}));

vi.mock("@/hooks/useAnalyticsStats", () => ({
  useAnalyticsStats: vi.fn(() => ({
    timeRange: "all",
    setTimeRange: vi.fn(),
    refreshKey: 0,
    refreshStats: vi.fn(),
  }))
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: { id: "test-user" } })),
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: vi.fn(() => ({ isSyncing: false, lastSynced: new Date().toISOString(), sync: vi.fn() })),
}));

vi.mock("@/hooks/useDatabase", () => ({
  useResults: vi.fn(() => ({
    results: [
      { id: "1", quiz_id: "q1", score: 80, timestamp: Date.now(), time_taken_seconds: 120 }
    ],
    isLoading: false,
    error: null,
  })),
  useQuizzes: vi.fn(() => ({
    quizzes: [
      { id: "q1", title: "Test Quiz" }
    ],
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
  it("renders all analytics components when loaded", async () => {
    render(<AnalyticsPage />);
    
    // Wait for the synchronous components
    expect(screen.getByTestId("analytics-overview")).toBeDefined();
    expect(screen.getByTestId("topic-heatmap")).toBeDefined();
    expect(screen.getByTestId("weak-areas-card")).toBeDefined();
    expect(screen.getByTestId("exam-readiness-card")).toBeDefined();
    expect(screen.getByTestId("streak-card")).toBeDefined();
    expect(screen.getByTestId("recent-results-card")).toBeDefined();
    expect(screen.getByTestId("retry-comparison-card")).toBeDefined();
    expect(screen.getByTestId("date-range-filter")).toBeDefined();
    
    // Wait for dynamic components (PerformanceHistory and CategoryTrendChart)
    await vi.waitFor(() => {
      expect(screen.getByTestId("performance-history")).toBeDefined();
      expect(screen.getByTestId("category-trend-chart")).toBeDefined();
    });
  });
});