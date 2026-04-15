import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hydrateAggregatedQuiz,
  resolveAggregatedResultReadModel,
} from "@/db/aggregatedQuiz";
import { db } from "@/db/dbInstance";

// Mock Dexie
vi.mock("@/db/dbInstance", () => ({
  db: {
    quizzes: {
      where: vi.fn(),
    },
  },
}));

describe("hydrateAggregatedQuiz", () => {
  const userId = "test-user";
  const question1 = { id: "q1", category: "Cat1", question: "Q1", correct_answer_hash: "h1", options: {} };
  const question2 = { id: "q2", category: "Cat2", question: "Q2", correct_answer_hash: "h2", options: {} };
  const quiz1 = {
    id: "quiz1",
    user_id: userId,
    title: "Quiz 1",
    questions: [question1],
    deleted_at: null,
  };
  const quiz2 = {
    id: "quiz2",
    user_id: userId,
    title: "Quiz 2",
    questions: [question2],
    deleted_at: null,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should hydrate a synthetic quiz from question IDs", async () => {
    // Mock db.quizzes.where(...).toArray() directly (filter removed)
    const mockWhere = {
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.quizzes.where as any).mockReturnValue(mockWhere);

    const result = await hydrateAggregatedQuiz(["q1", "q2"], userId);

    expect(result.syntheticQuiz.questions).toHaveLength(2);
    expect(result.syntheticQuiz.questions[0]?.id).toBe("q1");
    expect(result.syntheticQuiz.questions[1]?.id).toBe("q2");
    expect(result.sourceQuizByQuestionId.get("q1")?.id).toBe("quiz1");
    expect(result.sourceQuizByQuestionId.get("q2")?.id).toBe("quiz2");
    expect(result.sourceMap).toEqual({
      q1: "quiz1",
      q2: "quiz2",
    });
    expect(result.missingQuestionIds).toHaveLength(0);
  });

  it("should handle missing questions", async () => {
    const mockWhere = {
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([quiz1]), // quiz2 missing
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.quizzes.where as any).mockReturnValue(mockWhere);

    const result = await hydrateAggregatedQuiz(["q1", "q2"], userId);

    expect(result.syntheticQuiz.questions).toHaveLength(1);
    expect(result.syntheticQuiz.questions[0]?.id).toBe("q1");
    expect(result.sourceMap).toEqual({
      q1: "quiz1",
    });
    expect(result.missingQuestionIds).toContain("q2");
  });

  it("should respect question order", async () => {
     const mockWhere = {
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.quizzes.where as any).mockReturnValue(mockWhere);

    // Request q2 then q1
    const result = await hydrateAggregatedQuiz(["q2", "q1"], userId);

    expect(result.syntheticQuiz.questions[0]?.id).toBe("q2");
    expect(result.syntheticQuiz.questions[1]?.id).toBe("q1");
  });

  it("preserves persisted source_map keys and only backfills missing keys from hydration", async () => {
    const mockWhere = {
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.quizzes.where as any).mockReturnValue(mockWhere);

    const baseQuiz = {
      id: "aggregated-quiz",
      user_id: userId,
      title: "Base title",
      questions: [],
      deleted_at: null,
    };

    const result = await resolveAggregatedResultReadModel(
      {
        id: "result-1",
        quiz_id: baseQuiz.id,
        user_id: userId,
        timestamp: Date.now(),
        mode: "zen",
        score: 80,
        time_taken_seconds: 42,
        answers: {},
        flagged_questions: [],
        category_breakdown: { Networking: 80 },
        session_type: "topic_study",
        question_ids: ["q1", "q2"],
        source_map: { q2: "persisted-quiz-2" },
      },
      userId,
      baseQuiz as never,
    );

    expect(result.quiz.title).toBe("Topic Study: Networking");
    expect(result.quiz.questions.map((question) => question.id)).toEqual(["q1", "q2"]);
    expect(result.sourceMap).toEqual({
      q1: "quiz1",
      q2: "persisted-quiz-2",
    });
  });
});
