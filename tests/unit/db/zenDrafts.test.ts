import { beforeEach, describe, expect, it } from "vitest";
import { db, clearDatabase } from "@/db/dbInstance";
import {
  assessZenDraft,
  claimZenDraft,
  createZenDraft,
  discardZenDraft,
  getZenDraft,
  saveZenDraft,
  validateZenDraft,
  ZenDraftConflictError,
} from "@/db/zenDrafts";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import { ZEN_DRAFT_SCHEMA_VERSION, type ZenQuizDraft } from "@/types/zenDraft";

const quiz: Quiz = {
  id: "quiz-1",
  user_id: "user-1",
  title: "Local draft quiz",
  description: "",
  created_at: 100,
  updated_at: 100,
  questions: [
    {
      id: "question-1",
      category: "Test",
      question: "Question text must not enter a draft",
      options: { a: "Alpha", b: "Beta" },
      correct_answer_hash: "hash-a",
      explanation: "Explanation",
    },
    {
      id: "question-2",
      category: "Test",
      question: "Second question",
      options: { a: "Alpha", b: "Beta" },
      correct_answer_hash: "hash-b",
      explanation: "Explanation",
    },
  ],
  tags: [],
  version: 3,
  deleted_at: null,
  quiz_hash: "quiz-hash",
};

function buildDraft(overrides: Partial<ZenQuizDraft> = {}): ZenQuizDraft {
  return {
    schema_version: ZEN_DRAFT_SCHEMA_VERSION,
    user_id: "user-1",
    quiz_id: quiz.id,
    mode: "zen",
    quiz_version: quiz.version,
    quiz_hash: quiz.quiz_hash!,
    question_ids: quiz.questions.map((question) => question.id),
    current_index: 0,
    answers: [
      {
        question_id: "question-1",
        selected_answer: "a",
        is_correct: true,
        answered_at: 1_100,
        difficulty: "good",
        time_spent_seconds: 12,
      },
    ],
    flagged_question_ids: ["question-2"],
    hard_question_ids: [],
    selected_answer: "a",
    has_submitted: true,
    show_explanation: false,
    elapsed_seconds: 45,
    started_at: 1_000,
    updated_at: 1_100,
    writer_id: "writer-a",
    revision: 1,
    ...overrides,
  };
}

describe("device-local standard-Zen drafts", () => {
  beforeEach(async () => {
    await db.open();
    await clearDatabase();
    await db.quizzes.add(quiz);
  });

  it("round-trips serializable state without sync or quiz content", async () => {
    const draft = buildDraft();
    expect(validateZenDraft(draft, quiz, "user-1")).toBe(true);

    await createZenDraft(draft);
    const stored = await getZenDraft("user-1", quiz.id);

    expect(stored).toEqual(draft);
    expect(Array.isArray(stored?.answers)).toBe(true);
    expect(Array.isArray(stored?.flagged_question_ids)).toBe(true);
    expect(stored).not.toHaveProperty("synced");
    expect(JSON.stringify(stored)).not.toContain(
      "Question text must not enter",
    );
    expect(JSON.stringify(stored)).not.toContain("correct_answer");
  });

  it("isolates the same quiz key by user", async () => {
    const other = buildDraft({ user_id: "user-2", writer_id: "writer-b" });
    await createZenDraft(buildDraft());
    await createZenDraft(other);

    expect((await getZenDraft("user-1", quiz.id))?.writer_id).toBe("writer-a");
    expect((await getZenDraft("user-2", quiz.id))?.writer_id).toBe("writer-b");
  });

  it("rejects an older tab write and preserves the newer revision", async () => {
    const original = buildDraft();
    await createZenDraft(original);
    const saved = await saveZenDraft(
      {
        ...original,
        current_index: 1,
        selected_answer: null,
        has_submitted: false,
      },
      1,
    );

    await expect(
      saveZenDraft({ ...original, elapsed_seconds: 99 }, 1),
    ).rejects.toBeInstanceOf(ZenDraftConflictError);
    expect(await getZenDraft("user-1", quiz.id)).toMatchObject({
      current_index: 1,
      revision: saved.revision,
      writer_id: "writer-a",
    });
  });

  it("claims ownership explicitly and compare-and-set discards", async () => {
    const original = buildDraft();
    await createZenDraft(original);
    const claimed = await claimZenDraft(original, "writer-b");

    expect(claimed).toMatchObject({ writer_id: "writer-b", revision: 2 });
    await expect(discardZenDraft("user-1", quiz.id, 1)).rejects.toBeInstanceOf(
      ZenDraftConflictError,
    );
    await discardZenDraft("user-1", quiz.id, 2);
    expect(await getZenDraft("user-1", quiz.id)).toBeUndefined();
  });

  it.each([
    ["wrong schema", { schema_version: 99 }],
    ["wrong user", { user_id: "user-2" }],
    ["wrong mode", { mode: "proctor" }],
    ["out of range position", { current_index: 2 }],
    ["duplicate question", { question_ids: ["question-1", "question-1"] }],
    ["unknown flag", { flagged_question_ids: ["unknown"] }],
    ["negative elapsed", { elapsed_seconds: -1 }],
  ])("rejects %s before hydration", (_label, overrides) => {
    expect(
      validateZenDraft(
        buildDraft(overrides as Partial<ZenQuizDraft>),
        quiz,
        "user-1",
      ),
    ).toBe(false);
  });

  it("separates quiz changes from newer-result conflicts", async () => {
    const draft = buildDraft();
    await createZenDraft(draft);
    expect((await assessZenDraft(draft, quiz, "user-1"))?.compatibility).toBe(
      "resumable",
    );

    const changedQuiz = { ...quiz, version: quiz.version + 1 };
    expect(
      (await assessZenDraft(draft, changedQuiz, "user-1"))?.compatibility,
    ).toBe("quiz-changed");

    await db.results.add({
      id: "result-newer",
      quiz_id: quiz.id,
      user_id: "user-1",
      timestamp: 2_000,
      mode: "zen",
      score: 100,
      time_taken_seconds: 60,
      answers: { "question-1": "a" },
      flagged_questions: [],
      category_breakdown: {},
      synced: 1,
    } satisfies Result);
    const conflict = await assessZenDraft(draft, quiz, "user-1");
    expect(conflict?.compatibility).toBe("result-conflict");

    const acknowledged = await claimZenDraft(draft, "writer-b", 2_000);
    expect(
      (await assessZenDraft(acknowledged, quiz, "user-1"))?.compatibility,
    ).toBe("resumable");
  });

  it("retains an unavailable quiz draft until explicit cleanup", async () => {
    const draft = buildDraft();
    await createZenDraft(draft);
    const deletedQuiz = { ...quiz, deleted_at: 2_500 };

    expect(
      (await assessZenDraft(draft, deletedQuiz, "user-1"))?.compatibility,
    ).toBe("invalid");
    expect(await getZenDraft("user-1", quiz.id)).toEqual(draft);
  });

  it("includes drafts in central factory-reset cleanup", async () => {
    await createZenDraft(buildDraft());
    await clearDatabase();
    expect(await db.zenDrafts.count()).toBe(0);
  });
});
