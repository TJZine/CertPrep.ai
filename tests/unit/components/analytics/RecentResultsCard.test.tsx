import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecentResultsCard } from "@/components/analytics/RecentResultsCard";
import type { Result } from "@/types/result";
import type { Quiz } from "@/types/quiz";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mockPush } => ({
    push: mockPush,
  }),
}));

describe("RecentResultsCard", () => {
  const mockResult1: Result = {
    id: "res-1",
    quiz_id: "quiz-1",
    user_id: "user-1",
    score: 80,
    mode: "zen",
    timestamp: 1700000000000,
    time_taken_seconds: 120,
    answers: {},
    flagged_questions: [],
    category_breakdown: {},
  };

  const mockResult2: Result = {
    id: "res-2",
    quiz_id: "quiz-2",
    user_id: "user-1",
    score: 90,
    mode: "proctor",
    timestamp: 1600000000000,
    time_taken_seconds: 60,
    answers: {},
    flagged_questions: [],
    category_breakdown: {},
  };

  const mockResults: Result[] = [mockResult1, mockResult2];

  const mockQuizTitles = new Map([
    ["quiz-1", "React Fundamentals"],
    ["quiz-2", "Advanced TypeScript"],
  ]);

  it("renders empty state when no results provided", () => {
    render(<RecentResultsCard results={[]} />);
    expect(screen.getByText("Recent Results")).toBeInTheDocument();
    expect(
      screen.getByText("Complete some quizzes to see your recent results."),
    ).toBeInTheDocument();
  });

  it("renders results with correct titles from map", () => {
    render(
      <RecentResultsCard results={mockResults} quizTitles={mockQuizTitles} />,
    );
    expect(screen.getByText("React Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Advanced TypeScript")).toBeInTheDocument();
  });

  it("uses session_type fallbacks when applicable", () => {
    const sessionResults: Result[] = [
      {
        ...mockResult1,
        id: "res-3",
        session_type: "srs_review",
      },
    ];
    render(<RecentResultsCard results={sessionResults} />);
    expect(screen.getByText("SRS Review")).toBeInTheDocument();
  });

  it("shows warning for quizzes missing category metadata", () => {
    const quizzesMissingCategory: Quiz[] = [
      {
        id: "quiz-1",
        title: "No Category Quiz",
        user_id: "user-1",
        description: "",
        tags: [],
        version: 1,
        questions: [],
        created_at: 100,
        updated_at: 100,
        category: "", // Missing
      },
    ];
    render(
      <RecentResultsCard
        results={mockResults}
        quizzes={quizzesMissingCategory}
      />,
    );

    // The alert triangle has aria-hidden="true" but its wrapper button has tooltip
    const tooltipTarget = screen.getByRole("button", {
      name: /Missing Category/i,
    });
    expect(tooltipTarget).toBeInTheDocument();
    expect(screen.getByText("Missing Category")).toBeInTheDocument();
  });

  it("limits results to initialLimit and shows 'View All' button", () => {
    // Generate 6 results, default limit is 5
    const manyResults = Array.from({ length: 6 }).map((_, i) => ({
      ...mockResult1,
      id: `res-${i}`,
      timestamp: 1700000000000 - i, // Sort order
    }));

    render(<RecentResultsCard results={manyResults} initialLimit={2} />);

    // Should show 'View All 6 Results'
    const viewAllBtn = screen.getByRole("button", {
      name: /View All 6 Results/i,
    });
    expect(viewAllBtn).toBeInTheDocument();

    // Clicking reveals more
    fireEvent.click(viewAllBtn);
    expect(
      screen.queryByRole("button", { name: /View All 6 Results/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates to result details on click", () => {
    render(
      <RecentResultsCard results={[mockResult1]} quizTitles={mockQuizTitles} />,
    );

    // Scorecard is clickable (has onClick passed down)
    const card = screen.getByText("React Fundamentals");
    fireEvent.click(card); // Click on title or card

    expect(mockPush).toHaveBeenCalledWith("/results/res-1");
  });
});
