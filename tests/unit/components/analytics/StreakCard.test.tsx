import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StreakCard } from "@/components/analytics/StreakCard";
import { formatDateKey } from "@/lib/date";

// Mock date utility
vi.mock("@/lib/date", () => ({
  formatDateKey: vi.fn((date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }),
}));

describe("StreakCard", () => {
  const mockActivity = [true, false, true, true, false, false, true];
  const mockStudyTime = [
    { date: formatDateKey(new Date()), minutes: 45 },
    { date: formatDateKey(new Date(Date.now() - 86400000 * 2)), minutes: 120 },
  ];

  it("renders streak statistics correctly", () => {
    render(
      <StreakCard
        currentStreak={5}
        longestStreak={12}
        consistencyScore={85}
        last7DaysActivity={mockActivity}
        dailyStudyTime={mockStudyTime}
      />
    );

    expect(screen.getByText("5 days")).toBeInTheDocument();
    expect(screen.getByText("Current Streak")).toBeInTheDocument();
    expect(screen.getByText("12 days")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders activity bars with correct labels", () => {
    render(
      <StreakCard
        currentStreak={1}
        longestStreak={1}
        consistencyScore={10}
        last7DaysActivity={mockActivity}
      />
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    const images = screen.getAllByRole("img");
    // Should have 7 bars
    expect(images).toHaveLength(7);
  });

  it("shows intensity-based bar colors", () => {
    const variedStudyTime = [
      { date: formatDateKey(new Date()), minutes: 100 }, // Max
      { date: formatDateKey(new Date(Date.now() - 86400000)), minutes: 20 }, // Low
    ];

    render(
      <StreakCard
        currentStreak={1}
        longestStreak={1}
        consistencyScore={10}
        last7DaysActivity={[true, true, false, false, false, false, false]}
        dailyStudyTime={variedStudyTime}
      />
    );

    const bars = screen.getAllByRole("img");
    // Today (index 0 in data loop which is last7DaysData[6] = daysAgo 0)
    // Actually the loop is for (let i = 6; i >= 0; i--) { ... data.push({daysAgo: i}) }
    // So daysAgo 0 is the LAST element in the bars list if rendered linearly.
    
    // Check if max minutes (100) has full intensity class (bg-success)
    const todayBar = bars[6];
    expect(todayBar).toHaveClass("bg-success");
    
    // Check if low minutes (20) has low intensity class (bg-success/30)
    const yesterdayBar = bars[5];
    expect(yesterdayBar).toHaveClass("bg-success/30");
  });

  it("renders empty state correctly", () => {
    render(
      <StreakCard
        currentStreak={0}
        longestStreak={0}
        consistencyScore={0}
        last7DaysActivity={[false, false, false, false, false, false, false]}
      />
    );

    expect(screen.getByText(/Complete a quiz today to start your streak!/i)).toBeInTheDocument();
    expect(screen.getByText("Track your daily study progress")).toBeInTheDocument();
  });
});