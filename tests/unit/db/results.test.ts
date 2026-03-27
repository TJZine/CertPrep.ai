import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { 
  calculateResults, 
  createResult, 
  getOverallStats, 
  deleteResult,
  type CreateResultInput
} from "@/db/results";
import { db } from "@/db/dbInstance";
import { evaluateAnswer } from "@/lib/grading";
import { NIL_UUID } from "@/lib/constants";
import type { Quiz, Question } from "@/types/quiz";
import type { Result } from "@/types/result";

// Mock dependencies
vi.mock("@/db/dbInstance", () => {
  const createMockTable = (): Record<string, unknown> => ({
    get: vi.fn(),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    sortBy: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
  });

  return {
    db: {
      quizzes: createMockTable(),
      results: createMockTable(),
    },
  };
});

vi.mock("@/lib/grading", () => ({
  evaluateAnswer: vi.fn(),
}));

vi.mock("@/lib/core/crypto", () => ({
  generateUUID: vi.fn().mockReturnValue("mock-uuid"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("src/db/results.ts", () => {
  const mockUserId = "user-123";
  const mockQuizId = "quiz-123";

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup generic mock behavior for Dexie chains
    const mockQuizzes = db.quizzes as unknown as { where: Mock, equals: Mock, filter: Mock, sortBy: Mock };
    const mockResults = db.results as unknown as { where: Mock, equals: Mock, filter: Mock, sortBy: Mock };
    
    [mockQuizzes, mockResults].forEach(mock => {
      mock.where.mockReturnThis();
      mock.equals.mockReturnThis();
      mock.filter.mockReturnThis();
      mock.sortBy.mockReturnThis();
    });
  });

  describe("calculateResults", () => {
    it("should calculate correct score and category breakdown", async () => {
      const mockQuiz = {
        id: mockQuizId,
        questions: [
          { id: "q1", category: "React" },
          { id: "q2", category: "React" },
          { id: "q3", category: "Node" },
        ],
      } as unknown as Quiz;
      const mockAnswers = { q1: "a", q2: "b", q3: "c" };

      vi.mocked(evaluateAnswer).mockImplementation(async (q: Question) => ({
        category: q.category || "Uncategorized",
        isCorrect: q.id === "q1" || q.id === "q3", // 2/3 correct
      }));

      const results = await calculateResults(mockQuiz, mockAnswers);

      expect(results.score).toBe(67); // 2/3 = 66.666...
      expect(results.categoryBreakdown).toEqual({
        React: 50,
        Node: 100,
      });
      expect(results.categoryScores).toEqual({
        React: { correct: 1, total: 2 },
        Node: { correct: 1, total: 1 },
      });
    });

    it("should handle activeQuestionIds filter", async () => {
      const mockQuiz = {
        id: mockQuizId,
        questions: [
          { id: "q1", category: "React" },
          { id: "q2", category: "Node" },
        ],
      } as unknown as Quiz;
      const mockAnswers = { q1: "a", q2: "b" };
      const activeQuestionIds = ["q1"];

      vi.mocked(evaluateAnswer).mockResolvedValue({ category: "React", isCorrect: true });

      const results = await calculateResults(mockQuiz, mockAnswers, activeQuestionIds);

      expect(results.score).toBe(100);
      expect(vi.mocked(evaluateAnswer)).toHaveBeenCalledTimes(1);
    });
  });

  describe("createResult", () => {
    it("should persist a new result correctly", async () => {
      const mockQuiz = {
        id: mockQuizId,
        user_id: mockUserId,
        questions: [{ id: "q1", category: "React" }],
      } as unknown as Quiz;
      const input: CreateResultInput = {
        quizId: mockQuizId,
        userId: mockUserId,
        mode: "zen",
        answers: { q1: "a" },
        flaggedQuestions: [],
        timeTakenSeconds: 30,
      };

      vi.mocked(db.quizzes.get).mockResolvedValue(mockQuiz);
      vi.mocked(evaluateAnswer).mockResolvedValue({ category: "React", isCorrect: true });

      const result = await createResult(input);

      expect(result.id).toBe("mock-uuid");
      expect(result.score).toBe(100);
      expect(db.results.add).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockUserId,
        quiz_id: mockQuizId,
        score: 100,
      }));
    });

    it("should throw if user context is missing", async () => {
      const input = { userId: "" } as unknown as CreateResultInput;
      await expect(createResult(input)).rejects.toThrow("Cannot create result without a user context.");
    });

    it("should throw if quiz is not found", async () => {
      vi.mocked(db.quizzes.get).mockResolvedValue(undefined as unknown as Quiz);
      const input = { userId: "u1", quizId: "q1" } as unknown as CreateResultInput;
      await expect(createResult(input)).rejects.toThrow("Quiz not found.");
    });

    it("should throw if security mismatch occurs", async () => {
      const mockQuiz = { id: "q1", user_id: "other-user" } as unknown as Quiz;
      vi.mocked(db.quizzes.get).mockResolvedValue(mockQuiz);
      const input = { userId: "u1", quizId: "q1" } as unknown as CreateResultInput;
      await expect(createResult(input)).rejects.toThrow("Security mismatch");
    });

    it("should allow calculation for System/Public quizzes (NIL_UUID owner)", async () => {
      const mockQuiz = { id: "q1", user_id: NIL_UUID, questions: [] } as unknown as Quiz;
      vi.mocked(db.quizzes.get).mockResolvedValue(mockQuiz);
      const input = { userId: "u1", quizId: "q1", answers: {}, timeTakenSeconds: 0 } as unknown as CreateResultInput;
      await createResult(input);
      expect(db.results.add).toHaveBeenCalled();
    });
  });

  describe("getOverallStats", () => {
    it("should aggregate stats correctly across multiple results", async () => {
      const mockQuizzes = [
        { id: "q1", user_id: mockUserId, questions: [{ id: "q1_1", category: "React" }], deleted_at: null },
      ] as unknown as Quiz[];
      const mockResults = [
        { score: 100, time_taken_seconds: 60, user_id: mockUserId, quiz_id: "q1", answers: { q1_1: "a" }, deleted_at: null },
        { score: 50, time_taken_seconds: 40, user_id: mockUserId, quiz_id: "q1", answers: { q1_1: "wrong" }, deleted_at: null },
      ] as unknown as Result[];

      // Detailed mock for Dexie chain
      const mockQuizQuery = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockQuizzes),
      } as unknown as ReturnType<typeof db.quizzes.where>;
      vi.mocked(db.quizzes.where).mockReturnValue(mockQuizQuery);

      const mockResultQuery = {
        equals: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue(mockResults),
      } as unknown as ReturnType<typeof db.results.where>;
      vi.mocked(db.results.where).mockReturnValue(mockResultQuery);

      vi.mocked(evaluateAnswer).mockImplementation(async (_q, ans) => ({
        category: "React",
        isCorrect: ans === "a",
      }));

      const stats = await getOverallStats(mockUserId);

      expect(stats.totalAttempts).toBe(2);
      expect(stats.averageScore).toBe(75);
      expect(stats.totalStudyTime).toBe(100);
      expect(stats.weakestCategories[0]).toEqual({ category: "React", avgScore: 50 });
    });
  });

  describe("deleteResult", () => {
    it("should perform a soft delete", async () => {
      const mockResult = { id: "r1", user_id: mockUserId } as unknown as Result;
      vi.mocked(db.results.get).mockResolvedValue(mockResult);

      await deleteResult("r1", mockUserId);

      expect(db.results.update).toHaveBeenCalledWith("r1", expect.objectContaining({
        synced: 0,
        deleted_at: expect.any(Number),
      }));
    });
  });
});
