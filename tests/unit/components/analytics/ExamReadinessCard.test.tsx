import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ExamReadinessCard } from "@/components/analytics/ExamReadinessCard";

describe("ExamReadinessCard", () => {
  const mockCategories = new Map([
    ["Frontend", 85],
    ["Backend", 60],
    ["DevOps", 45],
  ]);

  it("renders the overall readiness score correctly", () => {
    render(
      <ExamReadinessCard
        readinessScore={72}
        readinessConfidence="high"
        categoryReadiness={mockCategories}
      />
    );

    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("High Confidence")).toBeInTheDocument();
    expect(screen.getByText("You're on track to pass!")).toBeInTheDocument();
  });

  it("shows target message when below passing threshold", () => {
    render(
      <ExamReadinessCard
        readinessScore={65}
        readinessConfidence="medium"
        categoryReadiness={mockCategories}
        passingThreshold={75}
      />
    );

    expect(screen.getByText("Target: 75% to pass")).toBeInTheDocument();
    expect(screen.getByText("Medium Confidence")).toBeInTheDocument();
  });

  it("renders category breakdown bars", () => {
    render(
      <ExamReadinessCard
        readinessScore={70}
        readinessConfidence="high"
        categoryReadiness={mockCategories}
      />
    );

    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("DevOps")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("handles expanded state for many categories", () => {
    const manyCategories = new Map();
    for (let i = 0; i < 15; i++) {
      manyCategories.set(`Category ${i}`, 50);
    }

    render(
      <ExamReadinessCard
        readinessScore={50}
        readinessConfidence="medium"
        categoryReadiness={manyCategories}
      />
    );

    // Initial display is 10
    expect(screen.getByText("Showing 10 of 15")).toBeInTheDocument();
    
    const expandBtn = screen.getByRole("button", { name: /Show 5 more categories/i });
    fireEvent.click(expandBtn);

    expect(screen.getByText("Showing all 15")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show less/i })).toBeInTheDocument();
  });

  it("renders empty state placeholder when no data provided", () => {
    render(
      <ExamReadinessCard
        readinessScore={0}
        readinessConfidence="low"
        categoryReadiness={new Map()}
      />
    );

    expect(screen.getByText("Track your exam preparation progress")).toBeInTheDocument();
    expect(screen.getByText("Complete some quizzes to see your readiness score")).toBeInTheDocument();
    expect(screen.queryByText("Low Confidence")).not.toBeInTheDocument();
  });
});