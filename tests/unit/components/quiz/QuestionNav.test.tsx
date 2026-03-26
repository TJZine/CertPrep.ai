import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QuestionNavGrid, QuestionNavStrip } from "@/components/quiz/QuestionNavGrid";

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("QuestionNavGrid", () => {
  const mockQuestions = [
    { id: "q1", index: 0, status: "answered" as const },
    { id: "q2", index: 1, status: "flagged" as const },
    { id: "q3", index: 2, status: "seen" as const },
    { id: "q4", index: 3, status: "unseen" as const },
  ];

  const defaultProps = {
    questions: mockQuestions,
    currentIndex: 0,
    onNavigate: vi.fn(),
  };

  it("renders all question buttons with correct numbers", () => {
    render(<QuestionNavGrid {...defaultProps} />);
    
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
  });

  it("highlights the current question", () => {
    render(<QuestionNavGrid {...defaultProps} currentIndex={1} />);
    
    const currentBtn = screen.getByLabelText(/Question 2/);
    expect(currentBtn.getAttribute("aria-current")).toBe("step");
    expect(currentBtn.className).toContain("border-foreground");
  });

  it("calls onNavigate when a question is clicked", () => {
    render(<QuestionNavGrid {...defaultProps} />);
    
    const q3Btn = screen.getByText("3");
    fireEvent.click(q3Btn);
    
    expect(defaultProps.onNavigate).toHaveBeenCalledWith(2);
  });

  it("renders stats correctly", () => {
    render(<QuestionNavGrid {...defaultProps} />);
    
    expect(screen.getByText("1 answered")).toBeDefined();
    expect(screen.getByText("1 flagged")).toBeDefined();
    expect(screen.getByText("1 viewed")).toBeDefined();
    expect(screen.getByText("1 unseen")).toBeDefined();
  });

  it("disables buttons when disabled prop is true", () => {
    render(<QuestionNavGrid {...defaultProps} disabled={true} />);
    
    const btns = screen.getAllByRole("button");
    btns.forEach(btn => {
      expect((btn as HTMLButtonElement).disabled).toBe(true);
      expect(btn.className).toContain("opacity-50");
    });
  });

  it("renders flagged icon on flagged questions", () => {
    render(<QuestionNavGrid {...defaultProps} />);
    // Question 2 is flagged
    const q2Btn = screen.getByLabelText(/Question 2/);
    expect(q2Btn.querySelector("svg")).toBeDefined();
  });
});

describe("QuestionNavStrip", () => {
  const mockQuestions = [
    { id: "q1", index: 0, status: "answered" as const },
    { id: "q2", index: 1, status: "unseen" as const },
  ];

  const defaultProps = {
    questions: mockQuestions,
    currentIndex: 0,
    onNavigate: vi.fn(),
  };

  it("renders correctly in horizontal strip mode", () => {
    render(<QuestionNavStrip {...defaultProps} />);
    
    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("2")).toBeDefined();
  });

  it("highlights current question in strip", () => {
    render(<QuestionNavStrip {...defaultProps} currentIndex={1} />);
    
    const currentBtn = screen.getByText("2");
    expect(currentBtn.getAttribute("aria-current")).toBe("step");
  });

  it("scrolls current button into view on index change", () => {
    // Mock scrollIntoView
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    const { rerender } = render(<QuestionNavStrip {...defaultProps} />);
    
    rerender(<QuestionNavStrip {...defaultProps} currentIndex={1} />);
    
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("calls onNavigate when a button is clicked in strip", () => {
    render(<QuestionNavStrip {...defaultProps} />);
    
    const q2Btn = screen.getByText("2");
    fireEvent.click(q2Btn);
    
    expect(defaultProps.onNavigate).toHaveBeenCalledWith(1);
  });
});
