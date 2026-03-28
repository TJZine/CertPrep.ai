import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/page";

// Mock dependencies
vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: vi.fn(({ quizCardCount }: { quizCardCount: number }): React.ReactElement => (
    <div data-testid="dashboard-skeleton">Skeleton (Cards: {quizCardCount})</div>
  )),
}));

vi.mock("@/components/dashboard/DashboardLoader", () => ({
  __esModule: true,
  default: vi.fn((): React.ReactElement => <div data-testid="dashboard-loader" />),
}));

// Mock React.Suspense to capture the fallback
vi.mock("react", async () => {
  const actual = await vi.importActual("react");
  return {
    ...actual,
    Suspense: ({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }): React.ReactElement => (
      <div data-testid="suspense-boundary">
        <div data-testid="suspense-fallback">{fallback}</div>
        <div data-testid="suspense-content">{children}</div>
      </div>
    ),
  };
});

describe("DashboardPage", () => {
  it("renders correctly with Suspense and DashboardLoader", (): void => {
    render(<DashboardPage />);
    
    expect(screen.getByTestId("suspense-boundary")).toBeDefined();
    expect(screen.getByTestId("dashboard-loader")).toBeDefined();
    expect(screen.getByTestId("dashboard-skeleton")).toBeDefined();
    expect(screen.getByText("Skeleton (Cards: 0)")).toBeDefined();
  });
});
