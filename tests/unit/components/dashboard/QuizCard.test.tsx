import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizCard } from "@/components/dashboard/QuizCard";
import type { QuizStats } from "@/db/quizzes";
import type { Quiz } from "@/types/quiz";

vi.mock("next/navigation", () => ({
  useRouter: (): { push: ReturnType<typeof vi.fn> } => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: ReturnType<typeof vi.fn> } => ({
    addToast: vi.fn(),
  }),
}));

const quiz = {
  id: "quiz-1",
  user_id: "user-1",
  title: "Uncategorized quiz",
  description: "",
  tags: [],
  version: 1,
  questions: [],
  created_at: 100,
  updated_at: 100,
} satisfies Quiz;

const attemptedStats = {
  quizId: quiz.id,
  attemptCount: 3,
  lastAttemptScore: 90,
  lastAttemptDate: 1700000000000,
  averageScore: 73,
  bestScore: 100,
  totalStudyTime: 360,
} satisfies QuizStats;

describe("QuizCard", () => {
  it("provides a 24px missing-category warning target without changing its name", () => {
    render(
      <QuizCard
        quiz={quiz}
        stats={null}
        onStart={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const warning = screen.getByRole("button", {
      name: "Missing category for full analytics",
    });
    expect(warning).toHaveClass("h-6", "w-6");
  });

  it("renders the featured card as a compact two-column quick-start card", () => {
    render(
      <QuizCard
        quiz={quiz}
        stats={attemptedStats}
        onStart={vi.fn()}
        onDelete={vi.fn()}
        isFeatured
      />,
    );

    const featuredCard = screen
      .getByText("Quick start")
      .closest(".dashboard-card");
    expect(featuredCard).toHaveClass("lg:col-span-2");
    expect(featuredCard).not.toHaveClass("lg:row-span-2");
    expect(
      screen.getByRole("button", { name: "Study Again" }),
    ).toBeInTheDocument();
    expect(screen.getByText("73% average")).toBeInTheDocument();
    expect(screen.queryByText("Study Time")).not.toBeInTheDocument();
  });

  it("shows Continue Quiz only when a compatible local draft exists", () => {
    const onStart = vi.fn();
    const props = {
      quiz,
      stats: attemptedStats,
      onStart,
      onDelete: vi.fn(),
    };
    const { rerender } = render(<QuizCard {...props} hasResumableDraft />);

    expect(
      screen.getByRole("link", { name: "Continue Quiz" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Quiz" })).toHaveAttribute(
      "href",
      "/quiz/quiz-1/zen",
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose Mode" }));
    expect(onStart).toHaveBeenCalledWith(quiz);

    rerender(<QuizCard {...props} hasResumableDraft={false} />);

    expect(
      screen.queryByRole("link", { name: "Continue Quiz" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Study Again" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choose Mode" }),
    ).not.toBeInTheDocument();
  });
});
