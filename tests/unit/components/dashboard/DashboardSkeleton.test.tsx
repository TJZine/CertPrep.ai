import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

describe("DashboardSkeleton", () => {
  it("renders empty-state skeleton when quiz count is zero", () => {
    render(<DashboardSkeleton quizCardCount={0} />);
    expect(screen.getByText("No quizzes yet")).toBeInTheDocument();
  });

  it("renders a featured card without a two-row span when quiz count is positive", () => {
    render(<DashboardSkeleton quizCardCount={3} />);

    expect(screen.getByTestId("dashboard-skeleton-grid")).toHaveClass(
      "items-stretch",
    );
    const featuredCard = screen.getByTestId("dashboard-skeleton-featured-card");
    expect(featuredCard).toHaveClass("lg:col-span-2");
    expect(featuredCard).not.toHaveClass("lg:row-span-2");
    expect(screen.getAllByTestId("dashboard-skeleton-card")).toHaveLength(2);
  });

  it("matches the loaded dashboard SRS grid width", () => {
    render(<DashboardSkeleton quizCardCount={1} />);
    expect(screen.getByTestId("dashboard-skeleton-srs-grid")).toHaveClass(
      "max-w-3xl",
    );
    expect(screen.getByTestId("dashboard-skeleton-srs-grid")).not.toHaveClass(
      "max-w-2xl",
    );
  });
});
