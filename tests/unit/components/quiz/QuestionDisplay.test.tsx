import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { QuestionDisplay } from "@/components/quiz/QuestionDisplay";
import type { Question } from "@/types/quiz";

describe("QuestionDisplay", () => {
  const mockQuestion: Question = {
    id: "q-1",
    question: "What is <strong>2 + 2</strong>?",
    options: { a: "3", b: "4" },
    category: "Math",
    difficulty: "Easy",
    explanation: "Basic addition",
  };

  const defaultProps = {
    question: mockQuestion,
    questionNumber: 1,
    totalQuestions: 10,
    isFlagged: false,
    onToggleFlag: vi.fn(),
  };

  it("renders correctly with basic props", () => {
    render(<QuestionDisplay {...defaultProps} />);
    
    expect(screen.getByText("Question 1 of 10")).toBeDefined();
    expect(screen.getByText("Math")).toBeDefined();
    expect(screen.getByText("Easy")).toBeDefined();
    // Check for sanitized HTML (bold text)
    const questionText = screen.getByLabelText("Question text");
    expect(questionText.innerHTML).toContain("<strong>2 + 2</strong>");
  });

  it("calls onToggleFlag when flag button is clicked", () => {
    render(<QuestionDisplay {...defaultProps} />);
    
    const flagBtn = screen.getByLabelText("Flag for review");
    fireEvent.click(flagBtn);
    
    expect(defaultProps.onToggleFlag).toHaveBeenCalled();
  });

  it("renders flagged state correctly", () => {
    render(<QuestionDisplay {...defaultProps} isFlagged={true} />);
    
    const flagBtn = screen.getByLabelText("Remove flag");
    expect(flagBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Flagged")).toBeDefined();
  });

  it("applies correct difficulty badge variants", () => {
    const { rerender } = render(<QuestionDisplay {...defaultProps} />);
    expect(screen.getByText("Easy")).toBeDefined();

    rerender(<QuestionDisplay {...defaultProps} question={{ ...mockQuestion, difficulty: "Medium" }} />);
    expect(screen.getByText("Medium")).toBeDefined();

    rerender(<QuestionDisplay {...defaultProps} question={{ ...mockQuestion, difficulty: "Hard" }} />);
    expect(screen.getByText("Hard")).toBeDefined();
  });

  it("renders user notes when provided", () => {
    const questionWithNotes = { ...mockQuestion, user_notes: "Study more on arithmetic" };
    render(<QuestionDisplay {...defaultProps} question={questionWithNotes} />);
    
    expect(screen.getByText("Your Notes:")).toBeDefined();
    expect(screen.getByText("Study more on arithmetic")).toBeDefined();
  });

  it("hides flag button when showFlagButton is false", () => {
    render(<QuestionDisplay {...defaultProps} showFlagButton={false} />);
    
    expect(screen.queryByLabelText(/flag/i)).toBeNull();
  });
});
