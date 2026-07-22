import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizLayout } from "@/components/quiz/QuizLayout";

const defaultProps = {
  title: "Practice session",
  currentProgress: 1,
  totalQuestions: 10,
  timerDisplay: "00:42",
  onExit: vi.fn(),
  mode: "zen" as const,
};

describe("QuizLayout timer semantics", () => {
  it("announces the default count-up timer as elapsed time", () => {
    render(<QuizLayout {...defaultProps}>Question</QuizLayout>);

    expect(screen.getByLabelText("Elapsed time: 00:42")).toBeInTheDocument();
  });

  it("supports explicit remaining-time semantics for countdown callers", () => {
    render(
      <QuizLayout {...defaultProps} mode="proctor" timerKind="remaining">
        Question
      </QuizLayout>,
    );

    expect(screen.getByLabelText("Time remaining: 00:42")).toBeInTheDocument();
  });
});
