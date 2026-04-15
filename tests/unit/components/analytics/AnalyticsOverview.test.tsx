import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AnalyticsOverview,
} from "@/components/analytics/AnalyticsOverview";
import {
  AnalyticsOverviewSkeleton,
  AnalyticsSkeleton,
} from "@/components/analytics/AnalyticsSkeleton";
import { EmptyCardState } from "@/components/analytics/EmptyCardState";
import type { OverallStats } from "@/db/results";

const baseStats: OverallStats = {
  totalQuizzes: 12,
  totalAttempts: 18,
  averageScore: 84,
  totalStudyTime: 125,
  weakestCategories: [],
};

describe("AnalyticsOverview", () => {
  it("renders summary stat cards with formatted values", () => {
    const { container } = render(
      <AnalyticsOverview
        stats={baseStats}
        className="analytics-overview-custom"
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("84%")).toBeInTheDocument();
    expect(screen.getByText("02:05")).toBeInTheDocument();
    expect(screen.getByText("Total Quizzes")).toBeInTheDocument();
    expect(screen.getByText("Total Attempts")).toBeInTheDocument();
    expect(screen.getByText("Average Score")).toBeInTheDocument();
    expect(screen.getByText("Study Time")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      "analytics-overview-custom",
    );
  });

  it("shows a dash when there are no attempts yet", () => {
    render(
      <AnalyticsOverview
        stats={{
          ...baseStats,
          totalAttempts: 0,
          averageScore: 0,
        }}
      />,
    );

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});

describe("AnalyticsOverviewSkeleton", () => {
  it("renders four hidden stat-card placeholders", () => {
    const { container } = render(<AnalyticsOverviewSkeleton />);

    const skeletonGrid = container.firstElementChild;
    expect(skeletonGrid).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".card")).toHaveLength(4);
  });
});

describe("AnalyticsSkeleton", () => {
  it("renders loading landmarks and optional syncing text", () => {
    render(<AnalyticsSkeleton syncingText="Syncing latest results..." />);

    expect(
      screen.getByRole("status", { name: /loading analytics/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Track your progress and identify areas for improvement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Syncing latest results...")).toBeInTheDocument();
    expect(screen.getByText("Loading your analytics data...")).toBeInTheDocument();
  });
});

describe("EmptyCardState", () => {
  it("renders title, description, action, and resizes the body icon", () => {
    render(
      <EmptyCardState
        icon={<svg data-testid="empty-icon" className="text-info" />}
        title="No quiz data yet"
        description="Complete a quiz to unlock analytics."
        action={<button type="button">Start quiz</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: /no quiz data yet/i })).toBeInTheDocument();
    expect(
      screen.getByText("Complete a quiz to unlock analytics."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start quiz/i }),
    ).toBeInTheDocument();

    const [, icon] = screen.getAllByTestId("empty-icon");
    expect(icon).toHaveClass("h-12", "w-12", "text-info");
  });

  it("prefers a custom header icon while keeping the body icon content", () => {
    render(
      <EmptyCardState
        icon={<svg data-testid="body-icon" />}
        headerIcon={<svg data-testid="header-icon" />}
        title="Nothing here"
        description="Try again later."
      />,
    );

    const heading = screen.getByRole("heading", { name: /nothing here/i });
    expect(within(heading).getByTestId("header-icon")).toBeInTheDocument();
    expect(screen.getByTestId("body-icon")).toBeInTheDocument();
  });
});
