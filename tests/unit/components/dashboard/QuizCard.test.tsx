import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizCard } from "@/components/dashboard/QuizCard";
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
});
