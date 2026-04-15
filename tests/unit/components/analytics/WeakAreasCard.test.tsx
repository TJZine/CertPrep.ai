import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WeakAreasCard } from "@/components/analytics/WeakAreasCard";
// Remove unused useQuizzes to satisfy lint

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mockPush } => ({
    push: mockPush,
  }),
}));

// Mock useToast
const mockAddToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mockAddToast } => ({
    addToast: mockAddToast,
  }),
}));

// Mock db/results
const mockGetTopicStudyQuestions = vi.fn();
vi.mock("@/db/results", () => ({
  getTopicStudyQuestions: (): Promise<unknown> => mockGetTopicStudyQuestions(),
}));

// Mock useQuizzes
const mockUseQuizzes = vi.fn(() => ({
  quizzes: [
    { id: "quiz-1", title: "React Fundamentals" },
  ],
  error: null as Error | null,
}));
vi.mock("@/hooks/useDatabase", () => ({
  useQuizzes: (): { quizzes: unknown[]; error: Error | null } =>
    mockUseQuizzes() as unknown as { quizzes: unknown[]; error: Error | null },
}));

describe("WeakAreasCard", () => {
  const mockWeakAreas = [
    { category: "React", avgScore: 40, totalQuestions: 10, recentTrend: "declining" as const },
    { category: "TypeScript", avgScore: 65, totalQuestions: 5, recentTrend: "stable" as const },
  ];

  it("renders empty state when no weak areas provided", () => {
    render(<WeakAreasCard weakAreas={[]} />);
    expect(screen.getByText("Areas to Improve")).toBeInTheDocument();
    expect(screen.getByText(/No weak areas identified/i)).toBeInTheDocument();
  });

  it("renders the list of weak areas", () => {
    render(<WeakAreasCard weakAreas={mockWeakAreas} />);

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("opens study modal when clicking study button", async () => {
    mockGetTopicStudyQuestions.mockResolvedValue({
      questionIds: ["q1", "q2"],
      quizIds: ["quiz-1"],
      missedCount: 2,
      flaggedCount: 0,
      totalUniqueCount: 2,
    });

    render(<WeakAreasCard weakAreas={[mockWeakAreas[0]!]} userId="user-1" />);

    const studyBtn = screen.getByRole("button", { name: /Study This Topic/i });
    fireEvent.click(studyBtn);

    await waitFor(() => {
      expect(screen.getByText("Study React")).toBeInTheDocument();
      // "unique questions total" is in a span, "2" is in a strong inside it.
      expect(screen.getByText(/unique questions total/i)).toBeInTheDocument();
    });
  });

  it("starts studying and navigates when clicking start in modal", async () => {
    mockGetTopicStudyQuestions.mockResolvedValue({
      questionIds: ["q1", "q2"],
      quizIds: ["quiz-1"],
      missedCount: 2,
      flaggedCount: 0,
      totalUniqueCount: 2,
    });

    // Mock sessionStorage
    const mockSetItem = vi.spyOn(Storage.prototype, 'setItem');

    render(<WeakAreasCard weakAreas={[mockWeakAreas[0]!]} userId="user-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Study This Topic/i }));

    await waitFor(() => screen.getByText("Start Studying"));
    fireEvent.click(screen.getByText("Start Studying"));

    expect(mockSetItem).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/quiz/topic-review");
  });

  it("handles case where no questions are found to study", async () => {
    mockGetTopicStudyQuestions.mockResolvedValue({
      totalUniqueCount: 0,
    });

    render(<WeakAreasCard weakAreas={[mockWeakAreas[0]!]} userId="user-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Study This Topic/i }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith("info", expect.stringContaining("No active questions found"));
    });
  });

  it("renders trend badges correctly", () => {
    const areasWithTrends = [
      { category: "React", avgScore: 40, totalQuestions: 10, recentTrend: "improving" as const },
      { category: "TypeScript", avgScore: 65, totalQuestions: 5, recentTrend: "declining" as const },
    ];
    render(<WeakAreasCard weakAreas={areasWithTrends} />);

    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(screen.getByText("Declining")).toBeInTheDocument();
  });

  it("renders error message when quizzes fail to load", () => {
    mockUseQuizzes.mockReturnValue({
      quizzes: [],
      error: new Error("Database connection failed"),
    });

    render(<WeakAreasCard weakAreas={mockWeakAreas} userId="user-1" />);

    expect(screen.getByText(/Quiz titles may be incomplete: Database connection failed/i)).toBeInTheDocument();
  });
});