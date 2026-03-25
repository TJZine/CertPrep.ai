import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExamReadinessCard } from "@/components/analytics/ExamReadinessCard";

describe("ExamReadinessCard", () => {
  const defaultProps = {
    readinessScore: 85,
    readinessConfidence: "high" as const,
    categoryReadiness: new Map([
      ["React", 90],
      ["TypeScript", 80],
      ["NextJS", 60],
    ]),
  };

  it("renders overall readiness score and confidence", () => {
    render(<ExamReadinessCard {...defaultProps} />);

    // Score
    expect(screen.getByText(/85\s*%/)).toBeInTheDocument();
    
    // Title
    expect(screen.getByText(/Exam Readiness/i)).toBeInTheDocument();
    
    // Confidence
    expect(screen.getByText(/High Confidence/i)).toBeInTheDocument();
  });

  it("renders category bars with correct scores", () => {
    render(<ExamReadinessCard {...defaultProps} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText(/90\s*%/)).toBeInTheDocument();

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText(/80\s*%/)).toBeInTheDocument();

    expect(screen.getByText("NextJS")).toBeInTheDocument();
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
  });

  it("handles empty categories gracefully", () => {
    render(<ExamReadinessCard readinessScore={50} readinessConfidence="low" categoryReadiness={new Map()} />);
    
    expect(screen.getByText(/Complete some quizzes to see your readiness score/i)).toBeInTheDocument();
    expect(screen.queryByText(/Low Confidence/i)).not.toBeInTheDocument();
  });

  it("respects custom passingThreshold", () => {
    render(<ExamReadinessCard {...defaultProps} passingThreshold={95} />);
    // React is 90, so it's not passing anymore, the component handles colors dynamically.
    // The test just ensures it renders without crashing.
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText(/90\s*%/)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<ExamReadinessCard {...defaultProps} className="custom-readiness-card" />);
    // Ensure the card container has the class. We check the first child which is typically the Card.
    expect(container.firstChild).toHaveClass("custom-readiness-card");
  });
});