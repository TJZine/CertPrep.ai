import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AnalyticsSkeleton, AnalyticsOverviewSkeleton } from "@/components/analytics/AnalyticsSkeleton";

describe("AnalyticsSkeleton", () => {
  it("renders the overall skeleton layout with correct ARIA attributes", () => {
    render(<AnalyticsSkeleton />);

    const container = screen.getByRole("status");
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute("aria-label", "Loading analytics");
    expect(screen.getByText("Loading your analytics data...")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Track your progress and identify areas for improvement")).toBeInTheDocument();
  });

  it("renders syncing text when provided", () => {
    const syncingText = "Syncing with cloud...";
    render(<AnalyticsSkeleton syncingText={syncingText} />);
    
    expect(screen.getByText(syncingText)).toBeInTheDocument();
  });
});

describe("AnalyticsOverviewSkeleton", () => {
  it("renders 4 stat card skeletons", () => {
    const { container } = render(<AnalyticsOverviewSkeleton />);
    
    // A quick way to test the 4 skeletons generated without complex queries.
    // They are rendered inside a grid container.
    const gridContainer = container.firstChild as HTMLElement;
    expect(gridContainer).toHaveClass("grid");
    
    // Check that it contains 4 Card elements (which map to .card classes usually,
    // but since we mocked or it's a DOM node we just check children count).
    expect(gridContainer.childNodes.length).toBe(4);
  });
});