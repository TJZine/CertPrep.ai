import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizPersistence } from "@/components/quiz/hooks/useQuizPersistence";
import { useQuizSubmission } from "@/hooks/useQuizSubmission";
import { ensureSRSQuizExists } from "@/db/quizzes";
import {
  createSRSReviewResult,
  createTopicStudyResult,
  createInterleavedResult,
} from "@/db/results";

const mocks = vi.hoisted(() => {
  return {
    push: vi.fn(),
    addToast: vi.fn(),
    sync: vi.fn().mockResolvedValue(undefined),
    submitQuiz: vi.fn(),
    retrySave: vi.fn(),
    ensureSRSQuizExists: vi.fn(),
    createSRSReviewResult: vi.fn(),
    createTopicStudyResult: vi.fn(),
    createInterleavedResult: vi.fn(),
    clearSmartRoundState: vi.fn(),
    clearSRSReviewState: vi.fn(),
    clearTopicStudyState: vi.fn(),
    clearInterleavedState: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mocks.push })),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ addToast: mocks.addToast })),
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: vi.fn(() => ({ sync: mocks.sync })),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: vi.fn(() => "user-1"),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1" } })),
}));

vi.mock("@/hooks/useQuizSubmission", () => ({
  useQuizSubmission: vi.fn(),
}));

vi.mock("@/db/quizzes", () => ({
  ensureSRSQuizExists: mocks.ensureSRSQuizExists,
}));

vi.mock("@/db/results", () => ({
  createSRSReviewResult: mocks.createSRSReviewResult,
  createTopicStudyResult: mocks.createTopicStudyResult,
  createInterleavedResult: mocks.createInterleavedResult,
}));

vi.mock("@/lib/storage/smartRoundStorage", () => ({
  clearSmartRoundState: mocks.clearSmartRoundState,
}));
vi.mock("@/lib/storage/srsReviewStorage", () => ({
  clearSRSReviewState: mocks.clearSRSReviewState,
}));
vi.mock("@/lib/storage/topicStudyStorage", () => ({
  clearTopicStudyState: mocks.clearTopicStudyState,
}));
vi.mock("@/lib/storage/interleavedStorage", () => ({
  clearInterleavedState: mocks.clearInterleavedState,
}));

describe("useQuizPersistence", () => {
  const defaultProps = {
    config: {
      quizId: "quiz-1",
      isSmartRound: false,
      isSRSReview: false,
      isTopicStudy: false,
      isInterleaved: false,
      sourceMap: null,
      keyMappings: null,
    },
    questions: [],
    answers: new Map(),
    flaggedQuestions: new Set<string>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuizSubmission).mockReturnValue({
      saveError: false,
      isSaving: false,
      submitQuiz: mocks.submitQuiz,
      retrySave: mocks.retrySave,
    });

    vi.mocked(ensureSRSQuizExists).mockResolvedValue({
      id: "srs-quiz-1",
    } as never);

    vi.mocked(createSRSReviewResult).mockResolvedValue({
      id: "srs-result-1",
    } as never);
    vi.mocked(createTopicStudyResult).mockResolvedValue({
      id: "topic-result-1",
    } as never);
    vi.mocked(createInterleavedResult).mockResolvedValue({
      id: "interleaved-result-1",
    } as never);
  });

  it("should initialize and return submission methods", () => {
    const { result } = renderHook(() => useQuizPersistence(defaultProps));

    expect(result.current.saveError).toBe(false);
    expect(result.current.effectiveUserId).toBe("user-1");
    expect(typeof result.current.submitQuiz).toBe("function");
    expect(typeof result.current.clearSessionStorage).toBe("function");
  });

  it("persists an SRS review result, clears review storage, and routes to the saved result", async () => {
    const props = {
      ...defaultProps,
      config: {
        ...defaultProps.config,
        isSRSReview: true,
        sourceMap: new Map([
          ["q1", "source-quiz-1"],
          ["q2", "source-quiz-2"],
        ]),
      },
      questions: [
        { id: "q1", category: "Cardio" },
        { id: "q2", category: "Neuro" },
      ] as never,
      answers: new Map([
        ["q1", { selectedAnswer: "A", isCorrect: true }],
        ["q2", { selectedAnswer: "B", isCorrect: false }],
      ]),
      flaggedQuestions: new Set(["q2"]),
    };

    const { result } = renderHook(() => useQuizPersistence(props));

    await result.current.submitQuiz(120);

    expect(ensureSRSQuizExists).toHaveBeenCalledWith("user-1");
    expect(createSRSReviewResult).toHaveBeenCalledWith({
      userId: "user-1",
      srsQuizId: "srs-quiz-1",
      answers: { q1: "A", q2: "B" },
      flaggedQuestions: ["q2"],
      timeTakenSeconds: 120,
      questionIds: ["q1", "q2"],
      score: 50,
      categoryBreakdown: {
        Cardio: 100,
        Neuro: 0,
      },
      sourceMap: {
        q1: "source-quiz-1",
        q2: "source-quiz-2",
      },
    });
    expect(mocks.clearSRSReviewState).toHaveBeenCalledTimes(1);
    expect(mocks.clearTopicStudyState).not.toHaveBeenCalled();
    expect(mocks.clearInterleavedState).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(
      "success",
      "SRS Review complete! Keep up the great work.",
    );
    expect(mocks.push).toHaveBeenCalledWith("/results/srs-result-1");
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.submitQuiz).not.toHaveBeenCalled();
  });

  it("persists a topic study result, clears topic storage, and routes to analytics-friendly results", async () => {
    const props = {
      ...defaultProps,
      config: {
        ...defaultProps.config,
        isTopicStudy: true,
        sourceMap: new Map([
          ["q1", "source-quiz-1"],
          ["q2", "source-quiz-2"],
        ]),
      },
      questions: [
        { id: "q1", category: "Cardio" },
        { id: "q2", category: "Neuro" },
      ] as never,
      answers: new Map([
        ["q1", { selectedAnswer: "A", isCorrect: true }],
        ["q2", { selectedAnswer: "B", isCorrect: false }],
      ]),
      flaggedQuestions: new Set(["q1"]),
    };

    const { result } = renderHook(() => useQuizPersistence(props));

    await result.current.submitQuiz(90);

    expect(ensureSRSQuizExists).toHaveBeenCalledWith("user-1");
    expect(createTopicStudyResult).toHaveBeenCalledWith({
      userId: "user-1",
      srsQuizId: "srs-quiz-1",
      answers: { q1: "A", q2: "B" },
      flaggedQuestions: ["q1"],
      timeTakenSeconds: 90,
      questionIds: ["q1", "q2"],
      score: 50,
      categoryBreakdown: {
        Cardio: 100,
        Neuro: 0,
      },
      sourceMap: {
        q1: "source-quiz-1",
        q2: "source-quiz-2",
      },
    });
    expect(mocks.clearTopicStudyState).toHaveBeenCalledTimes(1);
    expect(mocks.clearSRSReviewState).not.toHaveBeenCalled();
    expect(mocks.clearInterleavedState).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(
      "success",
      "Topic Study complete! Great progress.",
    );
    expect(mocks.push).toHaveBeenCalledWith("/results/topic-result-1");
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.submitQuiz).not.toHaveBeenCalled();
  });

  it("persists an interleaved result with translated answers, clears interleaved storage, and routes to the saved result", async () => {
    const props = {
      ...defaultProps,
      config: {
        ...defaultProps.config,
        isInterleaved: true,
        sourceMap: new Map([
          ["q1", "source-quiz-1"],
          ["q2", "source-quiz-2"],
        ]),
        keyMappings: new Map<string, Record<string, string>>([
          ["q1", { A: "D" }],
          ["q2", { B: "C" }],
        ]),
      },
      questions: [
        { id: "q1", category: "Cardio" },
        { id: "q2", category: "Neuro" },
      ] as never,
      answers: new Map([
        ["q1", { selectedAnswer: "A", isCorrect: true }],
        ["q2", { selectedAnswer: "B", isCorrect: false }],
      ]),
      flaggedQuestions: new Set(["q2"]),
    };

    const { result } = renderHook(() => useQuizPersistence(props));

    await result.current.submitQuiz(75);

    expect(ensureSRSQuizExists).toHaveBeenCalledWith("user-1");
    expect(createInterleavedResult).toHaveBeenCalledWith({
      userId: "user-1",
      srsQuizId: "srs-quiz-1",
      answers: { q1: "D", q2: "C" },
      flaggedQuestions: ["q2"],
      timeTakenSeconds: 75,
      questionIds: ["q1", "q2"],
      sourceMap: {
        q1: "source-quiz-1",
        q2: "source-quiz-2",
      },
      score: 50,
      categoryBreakdown: {
        Cardio: 100,
        Neuro: 0,
      },
      categoryScores: {
        Cardio: { correct: 1, total: 1 },
        Neuro: { correct: 0, total: 1 },
      },
    });
    expect(mocks.clearInterleavedState).toHaveBeenCalledTimes(1);
    expect(mocks.clearSRSReviewState).not.toHaveBeenCalled();
    expect(mocks.clearTopicStudyState).not.toHaveBeenCalled();
    expect(mocks.addToast).toHaveBeenCalledWith(
      "success",
      "Interleaved Practice complete! Great job.",
    );
    expect(mocks.push).toHaveBeenCalledWith("/results/interleaved-result-1");
    expect(mocks.sync).toHaveBeenCalledTimes(1);
    expect(mocks.submitQuiz).not.toHaveBeenCalled();
  });

  it("should call underlying submitQuiz for standard quizzes", async () => {
    const { result } = renderHook(() => useQuizPersistence(defaultProps));

    await result.current.submitQuiz(120);
    expect(mocks.submitQuiz).toHaveBeenCalledWith(
      120,
      defaultProps.answers,
      defaultProps.flaggedQuestions,
    );
  });
});
