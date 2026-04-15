import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import type { OverallStats } from "@/db/results";

// Mock the formatTime utility to avoid dealing with exact time formatting logic
vi.mock("@/lib/date", () => ({
  formatTime: vi.fn((seconds: number) => `Formatted ${seconds}s`),
}));

describe("AnalyticsOverview", () => {
  const mockStats: OverallStats = {
    totalQuizzes: 10,
    totalAttempts: 25,
    averageScore: 85,
    totalStudyTime: 3600,
    weakestCategories: [],
  };

  it("renders the stat cards with correct values", () => {
    render(<AnalyticsOverview stats={mockStats} />);

    // Total Quizzes
    expect(screen.getByText("Total Quizzes")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    // Total Attempts
    expect(screen.getByText("Total Attempts")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();

    // Average Score
    expect(screen.getByText("Average Score")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    // Study Time
    expect(screen.getByText("Study Time")).toBeInTheDocument();
    expect(screen.getByText("Formatted 3600s")).toBeInTheDocument();
  });

  it("handles zero attempts gracefully", () => {
    const zeroStats: OverallStats = {
      ...mockStats,
      totalAttempts: 0,
      averageScore: 0,
    };
    render(<AnalyticsOverview stats={zeroStats} />);

    // Average Score should show "-" when 0 attempts
    expect(screen.getByText("Average Score")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <AnalyticsOverview stats={mockStats} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});