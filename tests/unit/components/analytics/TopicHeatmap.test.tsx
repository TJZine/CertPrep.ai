import * as React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TopicHeatmap } from "@/components/analytics/TopicHeatmap";
import type { Result } from "@/types/result";
import type { Quiz, Question } from "@/types/quiz";
import { waitForElementToBeRemoved } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mockPush } => ({
    push: mockPush,
  }),
}));

const mockAddToast = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mockAddToast } => ({
    addToast: mockAddToast,
  }),
}));

// Mock hash utility to avoid IndexedDB/crypto complexity in unit tests
vi.mock("@/lib/core/crypto", () => ({
  hashAnswer: vi.fn(async (val: string) => `hash-${val}`),
  getCachedHash: vi.fn(async (val: string) => `hash-${val}`),
}));

const mockGetTopicStudyQuestions = vi.fn();
vi.mock("@/db/results", () => ({
  getTopicStudyQuestions: vi.fn(() => mockGetTopicStudyQuestions()),
}));

describe("TopicHeatmap", () => {
  const mockQuestions: Question[] = [
    {
      id: "q-1",
      question: "Q1",
      options: {},
      correct_answer_hash: "hash-A",
      category: "Frontend",
      explanation: "",
    },
    {
      id: "q-2",
      question: "Q2",
      options: {},
      correct_answer_hash: "hash-B",
      category: "Backend",
      explanation: "",
    },
  ];

  const mockQuizzes: Quiz[] = [
    {
      id: "quiz-1",
      user_id: "user-1",
      title: "React Basics",
      description: "",
      tags: [],
      version: 1,
      category: "Development",
      questions: [mockQuestions[0]!],
      created_at: 100,
      updated_at: 100,
    },
    {
      id: "quiz-2",
      user_id: "user-1",
      title: "NodeJS Advanced",
      description: "",
      tags: [],
      version: 1,
      category: "Development",
      questions: [mockQuestions[1]!],
      created_at: 100,
      updated_at: 100,
    },
  ];

  const now = Date.now();
  const mockResults: Result[] = [
    {
      id: "res-1",
      quiz_id: "quiz-1",
      user_id: "user-1",
      score: 100,
      mode: "zen",
      timestamp: now,
      time_taken_seconds: 120,
      answers: { "q-1": "A" },
      flagged_questions: [],
      category_breakdown: { "Frontend": 100 },
    },
    {
      id: "res-2",
      quiz_id: "quiz-2",
      user_id: "user-1",
      score: 100,
      mode: "proctor",
      timestamp: now - 3600000, // 1 hour ago
      time_taken_seconds: 120,
      answers: { "q-2": "B" },
      flagged_questions: [],
      category_breakdown: { "Backend": 100 },
    },
  ];

  it("renders empty state when no data is available", async () => {
    render(<TopicHeatmap results={[]} quizzes={[]} />);
    await waitFor(() => {
      expect(screen.getByText("Topic Mastery Over Time")).toBeInTheDocument();
      expect(screen.getByText(/Complete some quizzes to see your/)).toBeInTheDocument();
    });
  });

  it("renders the heatmap with categories", async () => {
    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    // The component calculates data asynchronously in useEffect
    await waitFor(() => {
      expect(screen.getByText("Topic Mastery Over Time")).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
      expect(screen.getByText("Backend")).toBeInTheDocument();
    });
  });

  it("handles sorting menu trigger", async () => {
    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    // Wait for load
    await waitFor(() => {
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });

    // Find the sort button by its aria-label
    const sortBtn = screen.getByRole("button", { name: /Change sort order/i });
    expect(sortBtn).toBeInTheDocument();
    expect(sortBtn).toHaveTextContent(/Weakest First/i);
  });

  it("applies custom className", () => {
    const { container } = render(
      <TopicHeatmap results={mockResults} quizzes={mockQuizzes} className="custom-heatmap-class" />
    );
    expect(container.firstChild).toHaveClass("custom-heatmap-class");
  });

  it("sorts by Best First", async () => {
    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    const sortBtn = screen.getByRole("button", { name: /Change sort order/i });
    fireEvent.click(sortBtn);
    
    const bestOption = screen.getByRole("option", { name: /Strongest First/i });
    fireEvent.click(bestOption);

    // Wait for sort to apply
    await waitFor(() => {
      const rows = screen.getAllByRole("rowheader");
      expect(rows[0]).toHaveTextContent("Frontend"); // Frontend/Backend both 100 in mock, but Frontend created first
    });
  });

  it("groups by quiz category when in By Quiz Category mode", async () => {
    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    const sortBtn = screen.getByRole("button", { name: /Change sort order/i });
    fireEvent.click(sortBtn);
    
    const groupOption = screen.getByRole("option", { name: /By Quiz Category/i });
    fireEvent.click(groupOption);

    await waitFor(() => {
      // Group header for "Development"
      expect(screen.getByText("Development")).toBeInTheDocument();
      expect(screen.getByText(/2 topics/i)).toBeInTheDocument();
    });
  });

  it("toggles group collapse", async () => {
    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    const sortBtn = screen.getByRole("button", { name: /Change sort order/i });
    fireEvent.click(sortBtn);
    fireEvent.click(screen.getByRole("option", { name: /By Quiz Category/i }));

    await waitFor(() => screen.getByText("Development"));
    
    const groupToggle = screen.getByRole("button", { name: /Development/i });
    expect(groupToggle).toHaveAttribute("aria-expanded", "true");
    
    fireEvent.click(groupToggle);
    expect(groupToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("handles 'Study This Category' focus navigation", async () => {
    mockGetTopicStudyQuestions.mockResolvedValue({
      questionIds: ["q-1"],
      totalUniqueCount: 1,
      missedCount: 0,
      flaggedCount: 0,
    });

    render(<TopicHeatmap results={mockResults} quizzes={mockQuizzes} userId="user-1" />);
    await waitForElementToBeRemoved(() => screen.queryByTestId("heatmap-skeleton"));
    
    await waitFor(() => screen.getByText("Frontend"));
    
    const studyBtn = screen.getByRole("button", { name: /Study Frontend/i });
    fireEvent.click(studyBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/quiz/topic-review");
    });
  });
});