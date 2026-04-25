import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CategoryTrendChart } from "@/components/analytics/CategoryTrendChart";
import type { CategoryTrendPoint } from "@/hooks/useCategoryTrends";

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
const mockUseChartDimensions = vi.fn(() => ({
  containerRef: React.createRef<HTMLDivElement>(),
  dimensions: { width: 0, height: 0 },
  isReady: false,
}));

vi.mock("@/hooks/useChartColors", () => ({
  useChartColors: (): { colors: typeof chartColors; isReady: boolean } => ({
    colors: chartColors,
    isReady: true,
  }),
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
  Legend: (): React.ReactElement => <div data-testid="legend" />,
}));

describe("CategoryTrendChart", () => {
  const sampleData: CategoryTrendPoint[] = [
    { week: "Apr 1", Frontend: 80, Backend: 72 },
    { week: "Apr 8", Frontend: 84, Backend: 76 },
  ];

  it("renders an empty state when no trend data is available", () => {
    render(<CategoryTrendChart data={[]} categories={[]} />);

    expect(screen.getByText("Category Trends")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Complete quizzes over multiple weeks to see proficiency trends.",
      ),
    ).toBeInTheDocument();
  });

  it("renders the short-data prompt when only one week is available", () => {
    render(
      <CategoryTrendChart data={[sampleData[0]!]} categories={["Frontend"]} />,
    );

    expect(
      screen.getByText(
        "Need at least 2 weeks of data to show trends. Keep studying!",
      ),
    ).toBeInTheDocument();
  });

  it("applies a custom className to the card", () => {
    mockUseChartDimensions.mockReturnValueOnce({
      containerRef: React.createRef<HTMLDivElement>(),
      dimensions: { width: 800, height: 320 },
      isReady: true,
    });
    const { container } = render(
      <CategoryTrendChart
        data={sampleData}
        categories={["Frontend", "Backend"]}
        className="custom-category-trend"
      />,
    );

    expect(container.firstChild).toHaveClass("custom-category-trend");
    expect(screen.getByTestId("line-chart")).toHaveAttribute("data-points", "2");
    expect(screen.getByTestId("line-Frontend")).toBeInTheDocument();
    expect(screen.getByTestId("line-Backend")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });
});
