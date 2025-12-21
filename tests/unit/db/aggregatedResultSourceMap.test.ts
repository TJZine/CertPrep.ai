import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    createSRSReviewResult,
    createTopicStudyResult,
    type CreateSRSReviewResultInput,
    type CreateTopicStudyResultInput,
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

describe("SRS Review and Topic Study source_map", () => {
    const mockGet = db.quizzes.get as ReturnType<typeof vi.fn>;
    const mockAdd = db.results.add as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockGet.mockResolvedValue({
            id: "srs-quiz-123",
            user_id: "user-123",
            deleted_at: null,
        });
        mockAdd.mockResolvedValue(undefined);
    });

    describe("createSRSReviewResult", () => {
        const validInput: CreateSRSReviewResultInput = {
            userId: "user-123",
            srsQuizId: "srs-quiz-123",
            answers: { q1: "a", q2: "b" },
            flaggedQuestions: [],
            timeTakenSeconds: 120,
            questionIds: ["q1", "q2"],
            score: 75,
            categoryBreakdown: { "Security": 100, "Networking": 50 },
        };

        it("stores source_map when provided", async () => {
            const inputWithSourceMap = {
                ...validInput,
                sourceMap: { q1: "quiz-1", q2: "quiz-2" },
            };

            const result = await createSRSReviewResult(inputWithSourceMap);

            expect(result.source_map).toEqual({ q1: "quiz-1", q2: "quiz-2" });
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    source_map: { q1: "quiz-1", q2: "quiz-2" },
                }),
            );
        });

        it("stores undefined source_map when not provided", async () => {
            const result = await createSRSReviewResult(validInput);

            expect(result.source_map).toBeUndefined();
        });
    });

    describe("createTopicStudyResult", () => {
        const validInput: CreateTopicStudyResultInput = {
            userId: "user-123",
            srsQuizId: "srs-quiz-123",
            answers: { q1: "a", q2: "b" },
            flaggedQuestions: ["q1"],
            timeTakenSeconds: 90,
            questionIds: ["q1", "q2"],
            score: 50,
            categoryBreakdown: { "Security": 50 },
        };

        it("stores source_map when provided", async () => {
            const inputWithSourceMap = {
                ...validInput,
                sourceMap: { q1: "quiz-a", q2: "quiz-b" },
            };

            const result = await createTopicStudyResult(inputWithSourceMap);

            expect(result.source_map).toEqual({ q1: "quiz-a", q2: "quiz-b" });
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    source_map: { q1: "quiz-a", q2: "quiz-b" },
                }),
            );
        });

        it("stores undefined source_map when not provided", async () => {
            const result = await createTopicStudyResult(validInput);

            expect(result.source_map).toBeUndefined();
        });
    });
});
