import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

describe("DashboardSkeleton", () => {
    it("renders empty-state skeleton when quiz count is zero", () => {
        render(<DashboardSkeleton quizCardCount={0} />);
        expect(screen.getByText("No quizzes yet")).toBeInTheDocument();
    });

    it("renders hero-first asymmetric skeleton grid when quiz count is positive", () => {
        render(<DashboardSkeleton quizCardCount={3} />);

        expect(screen.getByTestId("dashboard-skeleton-grid")).toHaveClass(
            "auto-rows-[minmax(140px,auto)]",
        );
        expect(screen.getByTestId("dashboard-skeleton-hero-card")).toBeInTheDocument();
        expect(screen.getAllByTestId("dashboard-skeleton-card")).toHaveLength(2);
    });
});
