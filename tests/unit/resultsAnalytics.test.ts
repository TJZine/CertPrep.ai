import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOverallStats } from "@/db/results";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

const { quizzesData, resultsData, dbMock } = vi.hoisted(() => {
  const quizzesData: Quiz[] = [];
  const resultsData: Result[] = [];

  const quizzesWhere = vi.fn().mockReturnValue({
    equals: vi.fn().mockImplementation((userId: string) => ({
      toArray: vi
        .fn()
        .mockImplementation(async () =>
          quizzesData.filter((quiz) => quiz.user_id === userId),
        ),
    })),
  });

  const resultsWhere = vi.fn().mockReturnValue({
    equals: vi.fn().mockImplementation((userId: string) => ({
      toArray: vi
        .fn()
        .mockImplementation(async () =>
          resultsData.filter((result) => result.user_id === userId),
        ),
    })),
  });

  return {
    quizzesData,
    resultsData,
    dbMock: {
      quizzes: {
        where: quizzesWhere,
      },
      results: {
        where: resultsWhere,
      },
    },
  };
});

vi.mock("@/db", () => ({ db: dbMock }));

vi.mock("@/lib/utils", () => ({
  hashAnswer: vi.fn(async (answer: string) => `hash-${answer}`),
  calculatePercentage: (correct: number, total: number): number =>
    total === 0 ? 0 : Math.round((correct / total) * 100),
}));

describe("getOverallStats per-user scoping", () => {
  beforeEach(() => {
    quizzesData.length = 0;
    resultsData.length = 0;
  });

  it("only counts quizzes and results for the requested user", async () => {
    quizzesData.push(
      {
        id: "quiz-a",
        user_id: "user-a",
        title: "Networking Basics",
        description: "",
        created_at: 1,
        updated_at: 1,
        questions: [
          {
            id: "q1",
            category: "Networking",
            question: "What is TCP?",
            options: { a: "Protocol" },
            correct_answer: "Protocol",
            explanation: "",
          },
        ],
        tags: [],
        version: 1,
        deleted_at: null,
        quiz_hash: null,
      },
      {
        id: "quiz-b",
        user_id: "user-b",
        title: "Security Fundamentals",
        description: "",
        created_at: 1,
        updated_at: 1,
        questions: [
          {
            id: "q2",
            category: "Security",
            question: "What is TLS?",
            options: { a: "Protocol" },
            correct_answer: "Protocol",
            explanation: "",
          },
        ],
        tags: [],
        version: 1,
        deleted_at: null,
        quiz_hash: null,
      },
    );

    resultsData.push(
      {
        id: "result-a",
        quiz_id: "quiz-a",
        user_id: "user-a",
        timestamp: 1,
        mode: "zen",
        score: 80,
        time_taken_seconds: 120,
        answers: { q1: "Protocol" },
        flagged_questions: [],
        category_breakdown: {},
      },
      {
        id: "result-b",
        quiz_id: "quiz-b",
        user_id: "user-b",
        timestamp: 2,
        mode: "zen",
        score: 60,
        time_taken_seconds: 100,
        answers: { q2: "Protocol" },
        flagged_questions: [],
        category_breakdown: {},
      },
    );

    const stats = await getOverallStats("user-a");

    expect(stats.totalQuizzes).toBe(1);
    expect(stats.totalAttempts).toBe(1);
    expect(stats.weakestCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "Networking" }),
      ]),
    );
    expect(
      stats.weakestCategories.some((entry) => entry.category === "Security"),
    ).toBe(false);
  });
});
