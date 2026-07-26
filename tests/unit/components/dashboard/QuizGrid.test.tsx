import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizGrid } from "@/components/dashboard/QuizGrid";
import type { Quiz } from "@/types/quiz";
import type { QuizStats } from "@/db/quizzes";
import type { ZenDraftCompatibility } from "@/types/zenDraft";

const { quizCardSpy } = vi.hoisted(() => ({ quizCardSpy: vi.fn() }));

interface MockQuizCardProps {
  isFeatured?: boolean;
  hasResumableDraft?: boolean;
  quiz: { id: string };
}

vi.mock("@/components/dashboard/QuizCard", () => ({
  QuizCard: (props: MockQuizCardProps): React.JSX.Element => {
    quizCardSpy(props);
    return <div data-testid={`quiz-card-${props.quiz.id}`} />;
  },
}));

const makeQuiz = (id: string, title: string): Quiz => ({
  id,
  user_id: "user-1",
  title,
  description: "",
  created_at: 1700000000000,
  updated_at: 1700000000000,
  questions: [],
  tags: [],
  version: 1,
});

const quizzes: Quiz[] = [makeQuiz("q1", "Quiz 1"), makeQuiz("q2", "Quiz 2")];
const quizStats = new Map<string, QuizStats>();

describe("QuizGrid featured layout", () => {
  afterEach(() => {
    quizCardSpy.mockClear();
  });

  it("marks only the first quiz card as featured", () => {
    render(
      <QuizGrid
        quizzes={quizzes}
        quizStats={quizStats}
        onStartQuiz={vi.fn()}
        onDeleteQuiz={vi.fn()}
      />,
    );

    expect(quizCardSpy).toHaveBeenCalledTimes(2);
    expect(quizCardSpy.mock.calls[0]?.[0]?.isFeatured).toBe(true);
    expect(quizCardSpy.mock.calls[1]?.[0]?.isFeatured).toBe(false);
  });

  it("uses a single-row stretching grid without implicit featured-card row sizing", () => {
    render(
      <QuizGrid
        quizzes={quizzes}
        quizStats={quizStats}
        onStartQuiz={vi.fn()}
        onDeleteQuiz={vi.fn()}
      />,
    );

    const grid = screen.getByTestId("quiz-grid");
    expect(grid).toHaveClass("items-stretch");
    expect(grid).not.toHaveClass("auto-rows-[minmax(140px,auto)]");
  });

  it("marks only resumable drafts as continuable", () => {
    render(
      <QuizGrid
        quizzes={quizzes}
        quizStats={quizStats}
        zenDraftStatuses={
          new Map<string, ZenDraftCompatibility>([
            ["q1", "resumable"],
            ["q2", "quiz-changed"],
          ])
        }
        onStartQuiz={vi.fn()}
        onDeleteQuiz={vi.fn()}
      />,
    );

    expect(quizCardSpy.mock.calls[0]?.[0]?.hasResumableDraft).toBe(true);
    expect(quizCardSpy.mock.calls[1]?.[0]?.hasResumableDraft).toBe(false);
  });
});
