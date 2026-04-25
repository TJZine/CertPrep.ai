import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Timer } from "@/components/quiz/Timer";
import { TIMER } from "@/lib/constants";

describe("Timer", () => {
  it("renders the formatted time correctly", () => {
    render(<Timer secondsRemaining={125} />);
    // 125 seconds = 02:05
    expect(screen.getByText("02:05")).toBeDefined();
  });

  it("applies the foreground color when above warning threshold", () => {
    render(<Timer secondsRemaining={TIMER.WARNING_THRESHOLD_SECONDS + 10} />);
    const timerSpan = screen.getByText(/[\d:]+/);
    expect(timerSpan.className).toContain("text-foreground");
  });

  it("applies the destructive color when at or below warning threshold", () => {
    render(<Timer secondsRemaining={TIMER.WARNING_THRESHOLD_SECONDS} />);
    const timerSpan = screen.getByText(/[\d:]+/);
    expect(timerSpan.className).toContain("text-destructive");
  });

  it("handles negative seconds by showing 00:00", () => {
    render(<Timer secondsRemaining={-10} />);
    expect(screen.getByText("00:00")).toBeDefined();
  });
});
