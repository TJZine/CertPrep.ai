import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreakCard } from "@/components/analytics/StreakCard";

vi.mock("@/lib/date", () => ({
  formatDateKey: vi.fn((date: Date | string) => {
    if (typeof date === "string") return date;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }),
}));

describe("StreakCard", () => {
  beforeEach(() => {
    // Mock system time to a fixed date so "daysAgo" logic is deterministic if needed
    // Assuming today is 2024-01-10
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-10T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    currentStreak: 3,
    longestStreak: 10,
    consistencyScore: 85,
    last7DaysActivity: [true, false, true, true, false, false, true], // 0 is today, 6 is 6 days ago (depending on how component uses it, let's just pass 7 bools)
  };

  it("renders streak statistics", () => {
    render(<StreakCard {...defaultProps} />);

    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(screen.getByText("10 days")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders empty state when no activity in last 7 days and current streak is 0", () => {
    render(<StreakCard currentStreak={0} longestStreak={0} consistencyScore={0} last7DaysActivity={Array(7).fill(false)} />);

    // Should render the empty state prompt
    expect(screen.getByText(/Complete a quiz today to start your streak/i)).toBeInTheDocument();
  });

  it("renders daily study time bars", () => {
    const dailyStudyTime = [
      { date: "2024-01-10", minutes: 30 }, // Today (0 days ago)
      { date: "2024-01-09", minutes: 60 }, // Yesterday
    ];

    render(<StreakCard {...defaultProps} dailyStudyTime={dailyStudyTime} />);
    
    // Check if the title text format is present. formatMinutes for 30 is "30m", for 60 is "1h"
    // So there should be an img role with title containing "30m" and "1h"
    const bars = screen.getAllByRole("img");
    expect(bars.length).toBe(7); // 7 days of bars
    
    // One of them should have 30m
    const thirtyMinBar = bars.find(b => b.getAttribute("aria-label")?.includes("30m"));
    expect(thirtyMinBar).toBeDefined();

    // One of them should have 1h
    const oneHourBar = bars.find(b => b.getAttribute("aria-label")?.includes("1h"));
    expect(oneHourBar).toBeDefined();
  });

  it("applies custom className", () => {
    const { container } = render(<StreakCard {...defaultProps} className="custom-streak-class" />);
    expect(container.firstChild).toHaveClass("custom-streak-class");
  });
});