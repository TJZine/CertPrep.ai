import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useQuizSubmission } from "@/hooks/useQuizSubmission";
import { ResultCompletionError } from "@/db/resultErrors";

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  clearSmartRoundState: vi.fn(),
  createResult: vi.fn(),
  finalizeStandardZenResult: vi.fn(),
  initializeSRSForResult: vi.fn(),
  push: vi.fn(),
  quizGet: vi.fn(),
  sync: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mocks.push } => ({ push: mocks.push }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mocks.addToast } => ({
    addToast: mocks.addToast,
  }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): { user: { id: string } } => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: (): string => "user-1",
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: (): { sync: typeof mocks.sync } => ({ sync: mocks.sync }),
}));

vi.mock("@/db/results", () => ({
  createResult: mocks.createResult,
  finalizeStandardZenResult: mocks.finalizeStandardZenResult,
}));

vi.mock("@/db/srs", () => ({
  initializeSRSForResult: mocks.initializeSRSForResult,
}));

vi.mock("@/db", () => ({
  db: {
    quizzes: {
      get: mocks.quizGet,
    },
  },
}));

vi.mock("@/stores/quizSessionStore", () => ({
  useQuizSessionStore: (): {
    answers: Map<string, { selectedAnswer: string; isCorrect: boolean }>;
    flaggedQuestions: Set<string>;
    questions: Array<{ id: string }>;
    keyMappings: null;
  } => ({
    answers: new Map([["q1", { selectedAnswer: "a", isCorrect: true }]]),
    flaggedQuestions: new Set<string>(),
    questions: [{ id: "q1" }],
    keyMappings: null,
  }),
}));

vi.mock("@/lib/storage/smartRoundStorage", () => ({
  clearSmartRoundState: mocks.clearSmartRoundState,
}));

describe("useQuizSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createResult.mockReset();
    mocks.finalizeStandardZenResult.mockReset();
    mocks.createResult.mockResolvedValue({ id: "result-default" });
    mocks.finalizeStandardZenResult.mockResolvedValue({ id: "result-default" });
    mocks.sync.mockResolvedValue({ success: true });
    mocks.quizGet.mockResolvedValue(undefined);
    mocks.initializeSRSForResult.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("classifies quiz changes as permanent and does not retry them", async () => {
    mocks.finalizeStandardZenResult.mockRejectedValue(
      new ResultCompletionError(
        "QUIZ_CHANGED",
        "The quiz changed before this draft was completed.",
      ),
    );
    const { result } = renderHook(() =>
      useQuizSubmission({
        quizId: "quiz-1",
        standardZenDraftOwnerId: "writer-1",
      }),
    );

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.submitQuiz(
          60,
          new Map([["q1", { selectedAnswer: "a", isCorrect: true }]]),
          new Set(),
        );
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toMatchObject({ code: "QUIZ_CHANGED" });
    expect(result.current.failure).toEqual({
      kind: "permanent",
      code: "QUIZ_CHANGED",
      message:
        "This quiz changed while you were studying. Return to the dashboard and start a new attempt.",
      canRetry: false,
    });

    act(() => result.current.retrySave(60));
    expect(mocks.finalizeStandardZenResult).toHaveBeenCalledTimes(1);
    expect(mocks.createResult).not.toHaveBeenCalled();
  });

  it("retries transient storage failures and clears the failure on success", async () => {
    mocks.createResult
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce({ id: "result-1" });
    const { result } = renderHook(() =>
      useQuizSubmission({ quizId: "quiz-1" }),
    );

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.submitQuiz(
          60,
          new Map([["q1", { selectedAnswer: "a", isCorrect: true }]]),
          new Set(),
        );
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toMatchObject({ message: "storage unavailable" });
    expect(result.current.failure).toMatchObject({
      kind: "transient",
      canRetry: true,
    });

    act(() => result.current.retrySave(60));
    await waitFor(() => {
      expect(mocks.createResult).toHaveBeenCalledTimes(2);
      expect(mocks.push).toHaveBeenCalledWith("/results/result-1");
    });
    expect(result.current.failure).toBeNull();
  });

  it("appends a result without deleting a newer draft after ownership is lost", async () => {
    mocks.finalizeStandardZenResult.mockRejectedValue(
      new ResultCompletionError(
        "DRAFT_OWNERSHIP_LOST",
        "The saved draft is no longer owned by this quiz session.",
      ),
    );
    mocks.createResult.mockResolvedValue({ id: "result-2" });
    const { result } = renderHook(() =>
      useQuizSubmission({
        quizId: "quiz-1",
        standardZenDraftOwnerId: "writer-stale",
      }),
    );

    await act(async () => {
      await result.current.submitQuiz(
        60,
        new Map([["q1", { selectedAnswer: "a", isCorrect: true }]]),
        new Set(),
      );
    });

    expect(mocks.finalizeStandardZenResult).toHaveBeenCalledTimes(1);
    expect(mocks.createResult).toHaveBeenCalledTimes(1);
    expect(result.current.failure).toBeNull();
    expect(mocks.push).toHaveBeenCalledWith("/results/result-2");
  });
});
