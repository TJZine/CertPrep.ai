import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useZenDraftSession } from "@/components/quiz/hooks/useZenDraftSession";
import { clearDatabase, db } from "@/db/dbInstance";
import { createZenDraft } from "@/db/zenDrafts";
import { useQuizSessionStore } from "@/stores/quizSessionStore";
import type { Quiz } from "@/types/quiz";
import type { ZenQuizDraft } from "@/types/zenDraft";

const quiz: Quiz = {
  id: "quiz-hook",
  user_id: "user-1",
  title: "Hook quiz",
  description: "",
  created_at: 1,
  updated_at: 1,
  questions: [
    {
      id: "q1",
      category: "Test",
      question: "Question one",
      options: { a: "A", b: "B" },
      correct_answer: "a",
      explanation: "Because",
    },
    {
      id: "q2",
      category: "Test",
      question: "Question two",
      options: { a: "A", b: "B" },
      correct_answer: "b",
      explanation: "Because",
    },
  ],
  tags: [],
  version: 1,
  deleted_at: null,
  quiz_hash: "hook-hash",
};

function savedDraft(overrides: Partial<ZenQuizDraft> = {}): ZenQuizDraft {
  return {
    schema_version: 1,
    user_id: "user-1",
    quiz_id: quiz.id,
    mode: "zen",
    quiz_version: 1,
    quiz_hash: "hook-hash",
    question_ids: ["q1", "q2"],
    current_index: 1,
    answers: [
      {
        question_id: "q1",
        selected_answer: "a",
        is_correct: true,
        answered_at: 2_000,
        difficulty: "good",
        time_spent_seconds: 10,
      },
    ],
    flagged_question_ids: ["q2"],
    hard_question_ids: [],
    selected_answer: null,
    has_submitted: false,
    show_explanation: false,
    elapsed_seconds: 75,
    started_at: 1_000,
    updated_at: 2_000,
    writer_id: "writer-old",
    revision: 1,
    ...overrides,
  };
}

const timer = {
  startTimer: vi.fn(),
  pauseTimer: vi.fn(),
  resetTimer: vi.fn(),
};

describe("useZenDraftSession", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await db.open();
    await clearDatabase();
    await db.quizzes.add(quiz);
    act(() => useQuizSessionStore.getState().resetSession());
  });

  it("creates and autosaves only an eligible standard Zen session", async () => {
    const { result } = renderHook(() =>
      useZenDraftSession({
        quiz,
        userId: "user-1",
        enabled: true,
        seconds: 0,
        ...timer,
      }),
    );

    await waitFor(() => expect(result.current.saveStatus).toBe("saved"));
    expect(useQuizSessionStore.getState().quizId).toBe(quiz.id);
    expect(await db.zenDrafts.count()).toBe(1);
    expect(timer.startTimer).toHaveBeenCalled();

    act(() => useQuizSessionStore.getState().toggleFlag("q1"));
    await waitFor(
      async () => {
        expect(
          (await db.zenDrafts.get(["user-1", quiz.id]))?.flagged_question_ids,
        ).toEqual(["q1"]);
      },
      { timeout: 2_000 },
    );
    expect(result.current.saveMessage).toBe("Saved on this device.");
  });

  it("captures the latest session before unmount resets the shared store", async () => {
    const { result, unmount } = renderHook(() =>
      useZenDraftSession({
        quiz,
        userId: "user-1",
        enabled: true,
        seconds: 0,
        ...timer,
      }),
    );

    await waitFor(() => expect(result.current.saveStatus).toBe("saved"));
    act(() => useQuizSessionStore.getState().toggleFlag("q2"));
    unmount();

    await waitFor(
      async () => {
        expect(
          (await db.zenDrafts.get(["user-1", quiz.id]))
            ?.flagged_question_ids,
        ).toEqual(["q2"]);
      },
      { timeout: 2_000 },
    );
    expect(useQuizSessionStore.getState().quizId).toBeNull();
  });

  it("does not read, write, or initialize drafts for an excluded mode", async () => {
    renderHook(() =>
      useZenDraftSession({
        quiz,
        userId: "user-1",
        enabled: false,
        seconds: 0,
        ...timer,
      }),
    );

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(await db.zenDrafts.count()).toBe(0);
    expect(useQuizSessionStore.getState().quizId).toBeNull();
    expect(timer.startTimer).not.toHaveBeenCalled();
  });

  it("requires an explicit resume choice before hydrating", async () => {
    await createZenDraft(savedDraft());
    const { result } = renderHook(() =>
      useZenDraftSession({
        quiz,
        userId: "user-1",
        enabled: true,
        seconds: 75,
        ...timer,
      }),
    );

    await waitFor(() => expect(result.current.decision?.kind).toBe("resume"));
    expect(useQuizSessionStore.getState().quizId).toBeNull();
    expect(await db.zenDrafts.count()).toBe(1);

    await act(async () => result.current.resume());
    expect(result.current.decision).toBeNull();
    expect(useQuizSessionStore.getState()).toMatchObject({
      quizId: quiz.id,
      currentIndex: 1,
    });
    expect(useQuizSessionStore.getState().answers.get("q1")).toMatchObject({
      selectedAnswer: "a",
      difficulty: "good",
    });
    expect(useQuizSessionStore.getState().flaggedQuestions.has("q2")).toBe(
      true,
    );
    expect(timer.resetTimer).toHaveBeenCalledWith(75);
  });

  it("discards before Start Over and reports a newer-tab conflict", async () => {
    await createZenDraft(savedDraft());
    const { result } = renderHook(() =>
      useZenDraftSession({
        quiz,
        userId: "user-1",
        enabled: true,
        seconds: 0,
        ...timer,
      }),
    );
    await waitFor(() => expect(result.current.decision?.kind).toBe("resume"));
    await act(async () => result.current.startOver());

    const fresh = await db.zenDrafts.get(["user-1", quiz.id]);
    expect(fresh).toMatchObject({ current_index: 0, answers: [], revision: 1 });
    expect(fresh?.writer_id).not.toBe("writer-old");

    await db.zenDrafts.update(["user-1", quiz.id], {
      writer_id: "writer-newer-tab",
      revision: 2,
    });
    act(() => useQuizSessionStore.getState().toggleFlag("q2"));
    await waitFor(() => expect(result.current.saveStatus).toBe("conflict"), {
      timeout: 2_000,
    });
    expect((await db.zenDrafts.get(["user-1", quiz.id]))?.writer_id).toBe(
      "writer-newer-tab",
    );
  });
});
