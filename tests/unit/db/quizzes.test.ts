import { describe, expect, it, beforeEach } from "vitest";
import { db, clearDatabase } from "@/db/index";
import {
  createQuiz,
  updateQuiz,
  getQuizById,
  getAllQuizzes,
  getSRSQuizId,
  isSRSQuiz,
  getOrCreateSRSQuiz,
  LEGACY_SRS_QUIZ_ID_PREFIX,
} from "@/db/quizzes";
import { hashAnswer } from "@/lib/utils";
import type { QuizImportInput } from "@/validators/quizSchema";
import { validate as uuidValidate, version as uuidVersion } from "uuid";

describe("DB: quizzes", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  const userId = "user-123";

  const mockQuizInput: QuizImportInput = {
    title: "Unit Test Quiz",
    description: "Testing DB logic",
    questions: [
      {
        id: "q1",
        category: "Test",
        question: "What is 2+2?",
        options: { a: "3", b: "4" },
        correct_answer: "b", // Raw answer provided
        explanation: "Math",
      },
    ],
    tags: ["math"],
    version: 1,
  };

  it("should create a quiz and hash the correct answer automatically", async () => {
    const quiz = await createQuiz(mockQuizInput, { userId });

    expect(quiz).toBeDefined();
    expect(quiz.questions[0]!.correct_answer_hash).toBeDefined();
    expect(quiz.questions[0]!.correct_answer_hash).not.toBe("b"); // Should be hashed

    // Verify hash correctness
    const expectedHash = await hashAnswer("b");
    expect(quiz.questions[0]!.correct_answer_hash).toBe(expectedHash);
  });

  it("should update a quiz successfully when providing raw correct_answer without hash", async () => {
    // 1. Create initial quiz
    const created = await createQuiz(mockQuizInput, { userId });
    const quizId = created.id;

    // 2. Prepare update with a NEW question that has correct_answer but NO hash
    // This simulates an edit or import where the user added a question
    const newQuestion = {
      id: "q2",
      category: "Test",
      question: "What is 3+3?",
      options: { a: "6", b: "7" },
      correct_answer: "a", // Only raw answer
      explanation: "Math",
    };

    const updates = {
      title: "Updated Title",
      questions: [
        ...created.questions, // keep existing
        newQuestion, // add new one
      ],
    };

    // 3. Perform update
    await updateQuiz(quizId, userId, updates);

    // 4. Verify
    const updated = await getQuizById(quizId, userId);
    expect(updated).toBeDefined();
    expect(updated!.title).toBe("Updated Title");
    expect(updated!.questions).toHaveLength(2);

    const q2 = updated!.questions.find((q) => q.question === "What is 3+3?");
    expect(q2).toBeDefined();
    // The bug would cause this to fail before reaching here, or q2 would be missing hash if logic failed silently
    expect(q2!.correct_answer_hash).toBeDefined();
    expect(q2!.correct_answer_hash).toBe(await hashAnswer("a"));
  });

  it("should not expose correct_answer in the DB or returned object", async () => {
    // Although we keep it during sanitization, it should NOT be in the final DB record
    // createQuiz and updateQuiz should strip it before saving
    const quiz = await createQuiz(mockQuizInput, { userId });

    // Check the actual object returned
    expect(quiz.questions[0]!.correct_answer).toBeUndefined();

    // Check DB directly
    const stored = await db.quizzes.get(quiz.id);
    expect(stored!.questions[0]!.correct_answer).toBeUndefined();
  });
  it("should sort quizzes by created_at desc, then title asc (stable sort)", async () => {
    const now = Date.now();

    // Create 3 quizzes. logic:
    // Q1: Newer timestamp
    // Q2: Older timestamp, Title "B"
    // Q3: Older timestamp (same as Q2), Title "A"
    // Expected order: Q1, Q3, Q2

    // 1. Create them (timestamps will be slightly different by default)
    const q1 = await createQuiz({ ...mockQuizInput, title: "Newest" }, { userId });
    const q2 = await createQuiz({ ...mockQuizInput, title: "ZQuiz" }, { userId });
    const q3 = await createQuiz({ ...mockQuizInput, title: "AQuiz" }, { userId });

    // 2. Manually force timestamps in DB to ensure collision test
    await db.quizzes.update(q1.id, { created_at: now + 10000 });
    await db.quizzes.update(q2.id, { created_at: now });
    await db.quizzes.update(q3.id, { created_at: now });

    // 3. Fetch
    const sorted = await getAllQuizzes(userId);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]!.title).toBe("Newest"); // Most recent
    expect(sorted[1]!.title).toBe("AQuiz"); // Tie-breaker: A comes before Z
    expect(sorted[2]!.title).toBe("ZQuiz");
  });

  it("should bump version when category is updated", async () => {
    const quiz = await createQuiz(mockQuizInput, { userId });
    const initialVersion = quiz.version;

    await updateQuiz(quiz.id, userId, { category: "Insurance" });
    const updated = await getQuizById(quiz.id, userId);

    expect(updated!.version).toBe(initialVersion + 1);
    expect(updated!.category).toBe("Insurance");
  });

  it("should bump version when subcategory is updated", async () => {
    const quiz = await createQuiz(mockQuizInput, { userId });
    const initialVersion = quiz.version;

    await updateQuiz(quiz.id, userId, { subcategory: "Personal Lines" });
    const updated = await getQuizById(quiz.id, userId);

    expect(updated!.version).toBe(initialVersion + 1);
    expect(updated!.subcategory).toBe("Personal Lines");
  });
});

describe("SRS Quiz Utilities", () => {
  const userId = "user-srs-test";

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("getSRSQuizId", () => {
    it("should return a valid UUID", () => {
      const result = getSRSQuizId(userId);
      expect(uuidValidate(result)).toBe(true);
      expect(uuidVersion(result)).toBe(5);
    });

    it("should generate deterministic IDs", () => {
      const id1 = getSRSQuizId(userId);
      const id2 = getSRSQuizId(userId);
      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different users", () => {
      const id1 = getSRSQuizId("user-a");
      const id2 = getSRSQuizId("user-b");
      expect(id1).not.toBe(id2);
    });
  });

  describe("isSRSQuiz", () => {
    it("should return true for legacy srs- prefix", () => {
      expect(isSRSQuiz("srs-user-123")).toBe(true);
      expect(isSRSQuiz("srs-")).toBe(true);
      expect(isSRSQuiz("srs-abc-def")).toBe(true);
    });

    it("should return true for deterministic UUID when userId provided", () => {
      const srsId = getSRSQuizId(userId);
      expect(isSRSQuiz(srsId, userId)).toBe(true);
    });

    it("should return true for quiz objects with deterministic SRS id", () => {
      const srsId = getSRSQuizId(userId);
      expect(isSRSQuiz({ id: srsId, user_id: userId })).toBe(true);
    });

    it("should return false for regular quiz ids without user context", () => {
      expect(isSRSQuiz("quiz-123")).toBe(false);
      expect(isSRSQuiz("abcd-1234")).toBe(false);
      expect(isSRSQuiz("")).toBe(false);
    });

    it("should return false for ids containing srs but not legacy prefixed", () => {
      expect(isSRSQuiz("my-srs-quiz")).toBe(false);
      expect(isSRSQuiz("quiz-srs-123")).toBe(false);
    });
  });

  describe("getOrCreateSRSQuiz", () => {
    it("should create new quiz if none exists", async () => {
      const quiz = await getOrCreateSRSQuiz(userId);

      expect(quiz).toBeDefined();
      expect(quiz.id).toBe(getSRSQuizId(userId));
      expect(quiz.user_id).toBe(userId);
      expect(quiz.title).toBe("SRS Review Sessions");
      expect(quiz.questions).toHaveLength(0);
      expect(quiz.tags).toContain("srs");
      expect(quiz.tags).toContain("system");
    });

    it("should return existing quiz on second call", async () => {
      const quiz1 = await getOrCreateSRSQuiz(userId);
      const quiz2 = await getOrCreateSRSQuiz(userId);

      expect(quiz1.id).toBe(quiz2.id);
      expect(quiz1.created_at).toBe(quiz2.created_at);

      // Verify only one quiz in DB
      const allUserQuizzes = await db.quizzes.where("user_id").equals(userId).toArray();
      const allSRS = allUserQuizzes.filter((q) => isSRSQuiz(q));
      expect(allSRS).toHaveLength(1);
    });

    it("should create separate SRS quizzes for different users", async () => {
      const quiz1 = await getOrCreateSRSQuiz("user-a");
      const quiz2 = await getOrCreateSRSQuiz("user-b");

      expect(quiz1.id).not.toBe(quiz2.id);
      expect(quiz1.user_id).toBe("user-a");
      expect(quiz2.user_id).toBe("user-b");
    });

    it("should migrate legacy srs-{userId} quiz and results", async () => {
      const legacyId = `${LEGACY_SRS_QUIZ_ID_PREFIX}${userId}`;
      const now = Date.now();

      await db.quizzes.add({
        id: legacyId,
        user_id: userId,
        title: "SRS Review Sessions",
        description: "",
        questions: [],
        tags: ["srs", "system"],
        version: 1,
        created_at: now - 1000,
        updated_at: now - 1000,
        deleted_at: null,
        quiz_hash: null,
        last_synced_at: null,
        last_synced_version: null,
      });

      await db.results.add({
        id: "legacy-result-1",
        user_id: userId,
        quiz_id: legacyId,
        timestamp: now,
        mode: "zen",
        score: 100,
        time_taken_seconds: 10,
        answers: {},
        flagged_questions: [],
        category_breakdown: {},
        question_ids: [],
        synced: 0,
      });

      const migratedQuiz = await getOrCreateSRSQuiz(userId);
      expect(migratedQuiz.id).toBe(getSRSQuizId(userId));

      const legacyQuizAfter = await db.quizzes.get(legacyId);
      expect(legacyQuizAfter).toBeUndefined();

      const migratedResult = await db.results.get("legacy-result-1");
      expect(migratedResult?.quiz_id).toBe(migratedQuiz.id);
      expect(migratedResult?.synced).toBe(0);
    });
  });

  describe("SRS Quiz Filtering", () => {
    it("getAllQuizzes includes SRS quiz (filtering is in useQuizzes hook)", async () => {
      // NOTE: The DB function getAllQuizzes returns ALL quizzes including SRS.
      // Filtering happens in the useQuizzes React hook (useDatabase.ts).
      // This test verifies the DB layer behavior.

      // Create a regular quiz
      await db.quizzes.add({
        id: "regular-quiz-1",
        user_id: userId,
        title: "Regular Quiz",
        description: "",
        questions: [],
        tags: [],
        version: 1,
        created_at: Date.now(),
        updated_at: Date.now(),
        deleted_at: null,
        quiz_hash: null,
        last_synced_at: null,
        last_synced_version: null,
      });

      // Create an SRS quiz
      await getOrCreateSRSQuiz(userId);

      // getAllQuizzes at DB level includes both
      const quizzes = await getAllQuizzes(userId);

      expect(quizzes).toHaveLength(2);
      expect(quizzes.some((q) => q.id === "regular-quiz-1")).toBe(true);
      expect(quizzes.some((q) => isSRSQuiz(q))).toBe(true);
    });

    it("should still be accessible via direct DB query", async () => {
      const srsQuiz = await getOrCreateSRSQuiz(userId);

      // Direct access should work
      const retrieved = await db.quizzes.get(srsQuiz.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(srsQuiz.id);
    });
  });
});
