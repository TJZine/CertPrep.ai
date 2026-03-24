import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuizPersistence } from "@/components/quiz/hooks/useQuizPersistence";
import { useQuizSubmission } from "@/hooks/useQuizSubmission";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: vi.fn(() => ({ addToast: vi.fn() })),
}));

vi.mock("@/hooks/useSync", () => ({
  useSync: vi.fn(() => ({ sync: vi.fn().mockResolvedValue(undefined) })),
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

vi.mock("@/lib/smartRoundStorage", () => ({ clearSmartRoundState: vi.fn() }));
vi.mock("@/lib/srsReviewStorage", () => ({ clearSRSReviewState: vi.fn() }));
vi.mock("@/lib/topicStudyStorage", () => ({ clearTopicStudyState: vi.fn() }));
vi.mock("@/lib/interleavedStorage", () => ({ clearInterleavedState: vi.fn() }));

describe("useQuizPersistence", () => {
  const mockSubmitQuiz = vi.fn();
  const mockRetrySave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useQuizSubmission as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      saveError: false,
      submitQuiz: mockSubmitQuiz,
      retrySave: mockRetrySave,
    });
  });

  const defaultProps = {
    quizId: "quiz-1",
    isSmartRound: false,
    isSRSReview: false,
    isTopicStudy: false,
    isInterleaved: false,
    interleavedSourceMap: null,
    interleavedKeyMappings: null,
    questions: [],
    answers: new Map(),
    flaggedQuestions: new Set<string>(),
  };

  it("should initialize and return submission methods", () => {
    const { result } = renderHook(() => useQuizPersistence(defaultProps));

    expect(result.current.saveError).toBe(false);
    expect(result.current.effectiveUserId).toBe("user-1");
    expect(typeof result.current.submitQuiz).toBe("function");
    expect(typeof result.current.clearSessionStorage).toBe("function");
  });

  it("should call underlying submitQuiz for standard quizzes", async () => {
    const { result } = renderHook(() => useQuizPersistence(defaultProps));

    await result.current.submitQuiz(120);
    expect(mockSubmitQuiz).toHaveBeenCalledWith(120, defaultProps.answers, defaultProps.flaggedQuestions);
  });
});
