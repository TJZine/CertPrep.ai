import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearDatabase, db } from "@/db/dbInstance";
import { createZenDraft } from "@/db/zenDrafts";
import { finalizeStandardZenResult } from "@/db/results";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import type { ZenQuizDraft } from "@/types/zenDraft";

const quiz: Quiz = {
  id: "quiz-complete",
  user_id: "user-1",
  title: "Completion",
  description: "",
  created_at: 1,
  updated_at: 1,
  questions: [
    {
      id: "question-1",
      category: "Test",
      question: "One?",
      options: { a: "A", b: "B" },
      correct_answer: "a",
      explanation: "Because",
    },
  ],
  tags: [],
  version: 1,
  deleted_at: null,
  quiz_hash: "completion-hash",
};

const draft: ZenQuizDraft = {
  schema_version: 1,
  user_id: "user-1",
  quiz_id: quiz.id,
  mode: "zen",
  quiz_version: 1,
  quiz_hash: "completion-hash",
  question_ids: ["question-1"],
  current_index: 0,
  answers: [
    {
      question_id: "question-1",
      selected_answer: "a",
      is_correct: true,
      answered_at: 2,
      difficulty: "good",
      time_spent_seconds: 1,
    },
  ],
  flagged_question_ids: [],
  hard_question_ids: [],
  selected_answer: "a",
  has_submitted: true,
  show_explanation: false,
  elapsed_seconds: 1,
  started_at: 1,
  updated_at: 2,
  writer_id: "writer-1",
  revision: 1,
};

describe("standard Zen result finalization", () => {
  beforeEach(async () => {
    await db.open();
    await clearDatabase();
    await db.quizzes.add(quiz);
    await createZenDraft(draft);
  });

  it("appends one result and removes its owned draft atomically", async () => {
    const existing: Result = {
      id: "existing-result",
      quiz_id: quiz.id,
      user_id: "user-1",
      timestamp: 0,
      mode: "zen",
      score: 0,
      time_taken_seconds: 0,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      synced: 1,
    };
    await db.results.add(existing);

    const result = await finalizeStandardZenResult({
      quizId: quiz.id,
      userId: "user-1",
      mode: "zen",
      answers: { "question-1": "a" },
      flaggedQuestions: [],
      timeTakenSeconds: 60,
      activeQuestionIds: ["question-1"],
      draftWriterId: "writer-1",
    });

    expect(await db.results.count()).toBe(2);
    expect(await db.results.get("existing-result")).toEqual(existing);
    expect(await db.results.get(result.id)).toMatchObject({
      user_id: "user-1",
      quiz_id: quiz.id,
    });
    expect(await db.zenDrafts.get(["user-1", quiz.id])).toBeUndefined();
  });

  it("retains the draft and creates no result when result persistence fails", async () => {
    const add = vi
      .spyOn(db.results, "add")
      .mockRejectedValueOnce(new Error("simulated result failure"));

    await expect(
      finalizeStandardZenResult({
        quizId: quiz.id,
        userId: "user-1",
        mode: "zen",
        answers: { "question-1": "a" },
        flaggedQuestions: [],
        timeTakenSeconds: 60,
        activeQuestionIds: ["question-1"],
        draftWriterId: "writer-1",
      }),
    ).rejects.toThrow("simulated result failure");

    expect(await db.results.count()).toBe(0);
    expect(await db.zenDrafts.get(["user-1", quiz.id])).toEqual(draft);
    add.mockRestore();
  });

  it("does not delete or finalize a draft owned by another tab", async () => {
    await expect(
      finalizeStandardZenResult({
        quizId: quiz.id,
        userId: "user-1",
        mode: "zen",
        answers: { "question-1": "a" },
        flaggedQuestions: [],
        timeTakenSeconds: 60,
        activeQuestionIds: ["question-1"],
        draftWriterId: "writer-other",
      }),
    ).rejects.toThrow("no longer owned");

    expect(await db.results.count()).toBe(0);
    expect(await db.zenDrafts.get(["user-1", quiz.id])).toEqual(draft);
  });
});
