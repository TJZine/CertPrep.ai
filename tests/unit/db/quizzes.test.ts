import { describe, expect, it, beforeEach } from "vitest";
import { db, clearDatabase } from "@/db";
import {
  createQuiz,
  updateQuiz,
  getQuizById,
  getAllQuizzes,
  getSRSQuizId,
  isSRSQuiz,
  ensureSRSQuizExists,
  LEGACY_SRS_QUIZ_ID_PREFIX,
  searchQuizzes,
  updateQuestionNotes,
  deleteQuiz,
  undeleteQuiz,
} from "@/db/quizzes";
import { hashAnswer } from "@/lib/core/crypto";
import type { Question } from "@/types/quiz";
import type { Result } from "@/types/result";
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
    expect(q2!.correct_answer_hash).toBeDefined();
    expect(q2!.correct_answer_hash).toBe(await hashAnswer("a"));
  });

  it("should not expose correct_answer in the DB or returned object", async () => {
    const quiz = await createQuiz(mockQuizInput, { userId });
    expect(quiz.questions[0]!.correct_answer).toBeUndefined();

    const stored = await db.quizzes.get(quiz.id);
    expect(stored!.questions[0]!.correct_answer).toBeUndefined();
  });

  it("should sort quizzes by created_at desc, then title asc (stable sort)", async () => {
    const now = Date.now();
    const q1 = await createQuiz({ ...mockQuizInput, title: "Newest" }, { userId });
    const q2 = await createQuiz({ ...mockQuizInput, title: "ZQuiz" }, { userId });
    const q3 = await createQuiz({ ...mockQuizInput, title: "AQuiz" }, { userId });

    await db.quizzes.update(q1.id, { created_at: now + 10000 });
    await db.quizzes.update(q2.id, { created_at: now });
    await db.quizzes.update(q3.id, { created_at: now });

    const sorted = await getAllQuizzes(userId);

    expect(sorted).toHaveLength(3);
    expect(sorted[0]!.title).toBe("Newest");
    expect(sorted[1]!.title).toBe("AQuiz");
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
    });
  });

  describe("ensureSRSQuizExists", () => {
    it("should create new quiz if none exists", async () => {
      const quiz = await ensureSRSQuizExists(userId);
      expect(quiz).toBeDefined();
      expect(quiz.id).toBe(getSRSQuizId(userId));
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
        mode_id: 1, // Required by type
      } as unknown as Result);

      const migratedQuiz = await ensureSRSQuizExists(userId);
      expect(migratedQuiz.id).toBe(getSRSQuizId(userId));

      const legacyQuizAfter = await db.quizzes.get(legacyId);
      expect(legacyQuizAfter).toBeUndefined();

      const migratedResult = await db.results.get("legacy-result-1");
      expect(migratedResult?.quiz_id).toBe(migratedQuiz.id);
    });
  });

  describe("SRS Quiz Filtering", () => {
    it("getAllQuizzes includes SRS quiz", async () => {
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
      await ensureSRSQuizExists(userId);
      const quizzes = await getAllQuizzes(userId);
      expect(quizzes.some((q) => isSRSQuiz(q))).toBe(true);
    });
  });
});

describe("DB: quizzes - Advanced Search & Operations", () => {
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
        correct_answer: "b",
        explanation: "Math",
      },
    ],
    tags: ["math"],
    version: 1,
  };

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("Quiz Search", () => {
    it("should search quizzes by title", async () => {
      await createQuiz({ ...mockQuizInput, title: "Javascript Basics" }, { userId });
      await createQuiz({ ...mockQuizInput, title: "Node.js Advanced" }, { userId });
      
      const results = await searchQuizzes("Node", userId);
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe("Node.js Advanced");
    });

    it("should search quizzes by tags", async () => {
      await createQuiz({ ...mockQuizInput, title: "Q1", tags: ["frontend"] }, { userId });
      await createQuiz({ ...mockQuizInput, title: "Q2", tags: ["backend"] }, { userId });
      
      const results = await searchQuizzes("BACKEND", userId);
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe("Q2");
    });

    it("should return all quizzes on empty query", async () => {
      await createQuiz(mockQuizInput, { userId });
      const results = await searchQuizzes("  ", userId);
      expect(results).toHaveLength(1);
    });

    it("should exclude deleted quizzes from search", async () => {
      const q = await createQuiz(mockQuizInput, { userId });
      await db.quizzes.update(q.id, { deleted_at: Date.now() });
      
      const results = await searchQuizzes("Unit", userId);
      expect(results).toHaveLength(0);
    });
  });

  describe("Quiz Deletion and Restoration", () => {
    it("should soft delete a quiz", async () => {
      const q = await createQuiz(mockQuizInput, { userId });
      await deleteQuiz(q.id, userId);
      
      const deleted = await db.quizzes.get(q.id);
      expect(deleted!.deleted_at).not.toBeNull();
    });

    it("should undelete a quiz", async () => {
      const q = await createQuiz(mockQuizInput, { userId });
      await db.quizzes.update(q.id, { deleted_at: Date.now() });
      
      await undeleteQuiz(q.id, userId);
      const restored = await db.quizzes.get(q.id);
      expect(restored!.deleted_at).toBeNull();
    });

    it("should throw on unauthorized delete", async () => {
      const q = await createQuiz(mockQuizInput, { userId: "owner" });
      await expect(deleteQuiz(q.id, "stranger")).rejects.toThrow("Unauthorized quiz delete.");
    });
  });

  describe("Question Notes", () => {
    it("should update question notes with sanitization", async () => {
      const q = await createQuiz(mockQuizInput, { userId });
      const qId = q.questions[0]!.id;
      
      await updateQuestionNotes(q.id, qId, "<script>bad</script>Good note", userId);
      
      const updated = await getQuizById(q.id, userId);
      expect(updated!.questions[0]!.user_notes).toBe("Good note");
    });
  });

  describe("Advanced Sanitization", () => {
    it("should generate deterministic UUID v5 for non-UUID question IDs", async () => {
      const input: QuizImportInput = {
        ...mockQuizInput,
        questions: [{ ...mockQuizInput.questions[0]!, id: "legacy-1" }] as unknown as Question[],
      };
      const quiz = await createQuiz(input, { userId });
      expect(uuidValidate(quiz.questions[0]!.id)).toBe(true);
      expect(uuidVersion(quiz.questions[0]!.id)).toBe(5);
    });

    it("should backfill hashes from existing questions on update", async () => {
      const q = await createQuiz(mockQuizInput, { userId });
      const updates = {
        questions: [{ 
          id: q.questions[0]!.id,
          category: "Updated",
          question: "New?",
          options: { a: "b", b: "c" },
          explanation: "...",
        }] as unknown as Question[],
      };
      
      await updateQuiz(q.id, userId, updates);
      const updated = await getQuizById(q.id, userId);
      expect(updated!.questions[0]!.correct_answer_hash).toBe(q.questions[0]!.correct_answer_hash);
    });

    it("should throw on invalid question schema during sanitization", async () => {
      const input = {
        ...mockQuizInput,
        questions: [{ id: "q1" }] as unknown as Question[],
      } as unknown as QuizImportInput;
      await expect(createQuiz(input, { userId })).rejects.toThrow();
    });
  });
});
