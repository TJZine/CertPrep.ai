import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RetryComparisonCard } from "@/components/analytics/RetryComparisonCard";

describe("RetryComparisonCard", () => {
  it("renders empty state when data is not available", () => {
    render(<RetryComparisonCard firstAttemptAvg={null} retryAvg={null} avgImprovement={null} />);

    expect(screen.getByText("Retry Performance")).toBeInTheDocument();
    expect(screen.getByText("Retake some quizzes to see how you improve on repeated attempts.")).toBeInTheDocument();
  });

  it("renders comparison stats and positive improvement badge", () => {
    render(<RetryComparisonCard firstAttemptAvg={70} retryAvg={85} avgImprovement={15} />);

    expect(screen.getByText("First Attempt Average")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();

    expect(screen.getByText("Retry Average")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();

    expect(screen.getByText("+15% improvement")).toBeInTheDocument();
  });

  it("renders comparison stats and negative improvement badge", () => {
    render(<RetryComparisonCard firstAttemptAvg={80} retryAvg={75} avgImprovement={-5} />);

    expect(screen.getByText("-5% decline")).toBeInTheDocument();
  });

  it("renders comparison stats and neutral improvement badge", () => {
    render(<RetryComparisonCard firstAttemptAvg={80} retryAvg={80} avgImprovement={0} />);

    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <RetryComparisonCard firstAttemptAvg={70} retryAvg={85} avgImprovement={15} className="custom-retry-class" />
    );
    expect(container.firstChild).toHaveClass("custom-retry-class");
  });
});