import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    createInterleavedResult,
    type CreateInterleavedResultInput,
} from "@/db/results";
import { db } from "@/db";

// Mock db
vi.mock("@/db", () => ({
    db: {
        quizzes: {
            get: vi.fn(),
        },
        results: {
            add: vi.fn(),
        },
    },
}));

// Mock isSRSQuiz - always returns true for these tests
vi.mock("@/db/quizzes", () => ({
    isSRSQuiz: vi.fn().mockReturnValue(true),
}));

// Mock generateUUID
vi.mock("@/lib/utils", () => ({
    generateUUID: vi.fn().mockReturnValue("test-result-id"),
    calculatePercentage: vi.fn((a, b) => (b === 0 ? 0 : Math.round((a / b) * 100))),
}));

describe("createInterleavedResult", () => {
    const mockGet = db.quizzes.get as ReturnType<typeof vi.fn>;
    const mockAdd = db.results.add as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const validInput: CreateInterleavedResultInput = {
        userId: "user-123",
        srsQuizId: "srs-quiz-123",
        answers: { q1: "a", q2: "b" },
        flaggedQuestions: ["q1"],
        timeTakenSeconds: 120,
        questionIds: ["q1", "q2"],
        sourceMap: { q1: "quiz-1", q2: "quiz-2" },
        score: 50,
        categoryBreakdown: { Math: 100, Science: 0 },
    };

    it("creates result with session_type and source_map", async () => {
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "user-123",
            deleted_at: null,
        });
        mockAdd.mockResolvedValue(undefined);

        const result = await createInterleavedResult(validInput);

        expect(result.session_type).toBe("interleaved");
        expect(result.source_map).toEqual(validInput.sourceMap);
        expect(result.mode).toBe("zen");
        expect(mockAdd).toHaveBeenCalledWith(
            expect.objectContaining({
                session_type: "interleaved",
                source_map: validInput.sourceMap,
            }),
        );
    });

    it("throws if userId is missing", async () => {
        await expect(
            createInterleavedResult({ ...validInput, userId: "" }),
        ).rejects.toThrow("Cannot create result without a user context");
    });

    it("throws if srsQuizId is missing", async () => {
        await expect(
            createInterleavedResult({ ...validInput, srsQuizId: "" }),
        ).rejects.toThrow("srsQuizId is required");
    });

    it("throws if SRS quiz not found", async () => {
        mockGet.mockResolvedValue(null);

        await expect(createInterleavedResult(validInput)).rejects.toThrow(
            "SRS quiz not found",
        );
    });

    it("throws if SRS quiz is soft-deleted", async () => {
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "user-123",
            deleted_at: Date.now(),
        });

        await expect(createInterleavedResult(validInput)).rejects.toThrow(
            "SRS quiz not found",
        );
    });

    it("throws if SRS quiz belongs to different user", async () => {
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "different-user",
            deleted_at: null,
        });

        await expect(createInterleavedResult(validInput)).rejects.toThrow(
            "Security mismatch",
        );
    });

    it("persists question_ids for result hydration", async () => {
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "user-123",
            deleted_at: null,
        });
        mockAdd.mockResolvedValue(undefined);

        const result = await createInterleavedResult(validInput);

        expect(result.question_ids).toEqual(["q1", "q2"]);
    });

    it("includes computed_category_scores when provided", async () => {
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "user-123",
            deleted_at: null,
        });
        mockAdd.mockResolvedValue(undefined);

        const inputWithScores = {
            ...validInput,
            categoryScores: { Math: { correct: 1, total: 1 } },
        };

        const result = await createInterleavedResult(inputWithScores);

        expect(result.computed_category_scores).toEqual({
            Math: { correct: 1, total: 1 },
        });
    });
});
