import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PerformanceHistory } from "@/components/analytics/PerformanceHistory";
import type { Result } from "@/types/result";

const chartColors = {
  primary: "#3b82f6",
  correct: "#22c55e",
  incorrect: "#ef4444",
  warning: "#f59e0b",
  grid: "#e2e8f0",
  muted: "#64748b",
  background: "#ffffff",
  foreground: "#0f172a",
  tierExcellent: "#22c55e",
  tierGreat: "#3b82f6",
  tierGood: "#06b6d4",
  tierPassing: "#f59e0b",
  tierFailing: "#ef4444",
};

const mockUseChartColors = vi.fn(() => ({
  colors: chartColors,
  isReady: false,
}));
const mockUseChartDimensions = vi.fn(() => ({
  containerRef: React.createRef<HTMLDivElement>(),
  dimensions: { width: 0, height: 0 },
  isReady: false,
}));

vi.mock("@/hooks/useChartColors", () => ({
  useChartColors: (): ReturnType<typeof mockUseChartColors> =>
    mockUseChartColors(),
}));

vi.mock("@/hooks/useChartDimensions", () => ({
  useChartDimensions: (): ReturnType<typeof mockUseChartDimensions> =>
    mockUseChartDimensions(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.ReactElement => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({
    data,
    children,
  }: {
    data: unknown[];
    children: React.ReactNode;
  }): React.ReactElement => (
    <div data-testid="line-chart" data-points={data.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey }: { dataKey: string }): React.ReactElement => (
    <div data-testid={`line-${dataKey}`} />
  ),
  XAxis: (): React.ReactElement => <div data-testid="x-axis" />,
  YAxis: (): React.ReactElement => <div data-testid="y-axis" />,
  CartesianGrid: (): React.ReactElement => <div data-testid="grid" />,
  Tooltip: (): React.ReactElement => <div data-testid="tooltip" />,
  ReferenceLine: ({
    label,
  }: {
    label?: { value?: string };
  }): React.ReactElement => (
    <div data-testid="reference-line">{label?.value}</div>
  ),
}));

describe("PerformanceHistory", () => {
  const baseResult = {
    quiz_id: "quiz-1",
    user_id: "user-1",
    mode: "zen",
    time_taken_seconds: 60,
    answers: {},
    flagged_questions: [],
    category_breakdown: {},
  } satisfies Omit<Result, "id" | "score" | "timestamp">;

  const quizTitles = new Map([["quiz-1", "React Fundamentals"]]);

  it("renders an empty state when there are no results", () => {
    render(<PerformanceHistory results={[]} quizTitles={quizTitles} />);

    expect(screen.getByText("Performance History")).toBeInTheDocument();
    expect(
      screen.getByText("Complete some quizzes to see your performance history."),
    ).toBeInTheDocument();
  });

  it("shows a positive trend when recent scores outperform older ones", () => {
    mockUseChartColors.mockReturnValueOnce({
      colors: chartColors,
      isReady: true,
    });
    mockUseChartDimensions.mockReturnValueOnce({
      containerRef: React.createRef<HTMLDivElement>(),
      dimensions: { width: 800, height: 320 },
      isReady: true,
    });
    const results: Result[] = [
      { ...baseResult, id: "r1", timestamp: 6000, score: 95 },
      { ...baseResult, id: "r2", timestamp: 5000, score: 85 },
      { ...baseResult, id: "r3", timestamp: 4000, score: 75 },
      { ...baseResult, id: "r4", timestamp: 3000, score: 55 },
      { ...baseResult, id: "r5", timestamp: 2000, score: 45 },
      { ...baseResult, id: "r6", timestamp: 1000, score: 35 },
    ];

    render(<PerformanceHistory results={results} quizTitles={quizTitles} />);

    expect(screen.getByText("Performance History")).toBeInTheDocument();
    expect(screen.getByText("Your score trends over time")).toBeInTheDocument();
    expect(screen.getByText("+40%")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-points", "6");
    expect(screen.getByTestId("line-score")).toBeInTheDocument();
    expect(screen.getByTestId("reference-line")).toHaveTextContent("Avg: 65%");
  });

  it("shows a stable trend when recent and older averages match", () => {
    mockUseChartColors.mockReturnValueOnce({
      colors: chartColors,
      isReady: true,
    });
    mockUseChartDimensions.mockReturnValueOnce({
      containerRef: React.createRef<HTMLDivElement>(),
      dimensions: { width: 800, height: 320 },
      isReady: true,
    });
    const results: Result[] = [
      { ...baseResult, id: "r1", timestamp: 6000, score: 90 },
      { ...baseResult, id: "r2", timestamp: 5000, score: 80 },
      { ...baseResult, id: "r3", timestamp: 4000, score: 70 },
      { ...baseResult, id: "r4", timestamp: 3000, score: 90 },
      { ...baseResult, id: "r5", timestamp: 2000, score: 80 },
      { ...baseResult, id: "r6", timestamp: 1000, score: 70 },
    ];

    render(<PerformanceHistory results={results} quizTitles={quizTitles} />);

    expect(screen.getByText("Stable")).toBeInTheDocument();
  });
});
