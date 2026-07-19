import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultsContainer } from "@/components/results/ResultsContainer";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

vi.mock("next/dynamic", () => ({
  default: (): (() => null) => () => null,
}));

vi.mock("next/navigation", () => ({
  useRouter: (): {
    back: ReturnType<typeof vi.fn>;
    push: ReturnType<typeof vi.fn>;
  } => ({
    back: vi.fn(),
    push: vi.fn(),
  }),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (
    _querier: unknown,
    _dependencies: unknown[],
    defaultValue: unknown,
  ): unknown => defaultValue,
}));

vi.mock("@/hooks/useQuizGrading", () => ({
  useQuizGrading: (): {
    grading: {
      correctCount: number;
      incorrectCount: number;
      unansweredCount: number;
      questionStatus: Record<string, boolean>;
    };
    isLoading: boolean;
    error: null;
  } => ({
    grading: {
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
      questionStatus: { "question-1": true },
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useResolveCorrectAnswers", () => ({
  useResolveCorrectAnswers: (): {
    resolvedAnswers: Record<string, string>;
    isResolving: boolean;
    error: null;
  } => ({
    resolvedAnswers: { "question-1": "a" },
    isResolving: false,
    error: null,
  }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): { user: null } => ({ user: null }),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: (): null => null,
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: (): { sync: ReturnType<typeof vi.fn> } => ({ sync: vi.fn() }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: ReturnType<typeof vi.fn> } => ({
    addToast: vi.fn(),
  }),
}));

vi.mock("@/components/results/Scorecard", () => ({
  Scorecard: ({ modeLabel }: { modeLabel?: string }): React.ReactElement => (
    <div data-testid="scorecard-mode">{modeLabel}</div>
  ),
}));

vi.mock("@/components/results/QuestionReviewList", () => ({
  QuestionReviewList: (): null => null,
}));
vi.mock("@/components/results/SmartActions", () => ({
  SmartActions: (): null => null,
}));
vi.mock("@/components/results/AttemptHistoryTimeline", () => ({
  AttemptHistoryTimeline: (): null => null,
}));
vi.mock("@/components/results/DifficultyBreakdown", () => ({
  DifficultyBreakdown: (): null => null,
}));
vi.mock("@/components/results/SRSStatusDisplay", () => ({
  SRSStatusDisplay: (): null => null,
}));
vi.mock("@/components/results/SelfAssessmentSummary", () => ({
  SelfAssessmentSummary: (): null => null,
}));
vi.mock("@/components/results/TimePerQuestionHeatmap", () => ({
  TimePerQuestionHeatmap: (): null => null,
}));

vi.mock("@/lib/confetti", () => ({
  celebratePerfectScore: vi.fn(),
}));
vi.mock("@/lib/streaks", () => ({
  updateStudyStreak: vi.fn(),
}));

const quiz: Quiz = {
  id: "quiz-1",
  user_id: "user-1",
  title: "Interleaved Practice",
  description: "",
  created_at: 1,
  questions: [
    {
      id: "question-1",
      category: "Networking",
      question: "Question?",
      options: { a: "Answer" },
      correct_answer: "a",
      explanation: "Explanation",
    },
  ],
  tags: [],
  version: 1,
};

const result: Result = {
  id: "result-1",
  quiz_id: quiz.id,
  user_id: "user-1",
  timestamp: 1,
  mode: "zen",
  score: 100,
  time_taken_seconds: 20,
  answers: { "question-1": "a" },
  flagged_questions: [],
  category_breakdown: {},
  question_ids: ["question-1"],
  session_type: "interleaved",
  synced: 1,
};

describe("ResultsContainer result semantics", () => {
  it("passes the session-specific label to the scorecard", () => {
    render(<ResultsContainer result={result} quiz={quiz} />);

    expect(screen.getByTestId("scorecard-mode")).toHaveTextContent(
      "Interleaved Practice",
    );
    expect(screen.getAllByText("Interleaved Practice")).toHaveLength(3);
    expect(screen.queryByText("🧘 Zen Study Mode")).not.toBeInTheDocument();
  });

  it("gives Share and Print explicit accessible names", () => {
    render(<ResultsContainer result={result} quiz={quiz} />);

    expect(
      screen.getByRole("button", { name: "Share result" }),
    ).toHaveAttribute("aria-label", "Share result");
    expect(
      screen.getByRole("button", { name: "Print result" }),
    ).toHaveAttribute("aria-label", "Print result");
  });
});
