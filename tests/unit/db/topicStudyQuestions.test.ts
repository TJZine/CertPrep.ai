import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTopicStudyQuestions } from "@/db/results";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

const { quizzesData, resultsData, dbMock } = vi.hoisted(() => {
    const quizzesData: Quiz[] = [];
    const resultsData: Result[] = [];

    const quizzesWhere = vi.fn().mockReturnValue({
        equals: vi.fn().mockImplementation((userId: string) => ({
            toArray: vi
                .fn()
                .mockImplementation(async () =>
                    quizzesData.filter((quiz) => quiz.user_id === userId),
                ),
            filter: vi.fn().mockImplementation(() => ({
                sortBy: vi.fn().mockImplementation(async () =>
                    resultsData.filter((r) => !r.deleted_at).reverse(),
                ),
            })),
        })),
    });

    // Mock bulkGet for getTopicStudyQuestions
    const quizzesBulkGet = vi.fn().mockImplementation(async (ids: string[]) =>
        ids.map((id) => quizzesData.find((q) => q.id === id)),
    );

    const resultsWhere = vi.fn().mockReturnValue({
        equals: vi.fn().mockImplementation((userId: string) => ({
            toArray: vi
                .fn()
                .mockImplementation(async () =>
                    resultsData.filter((result) => result.user_id === userId),
                ),
            filter: vi.fn().mockImplementation(() => ({
                sortBy: vi.fn().mockImplementation(async () =>
                    resultsData.filter((r) => r.user_id === userId && !r.deleted_at).reverse(),
                ),
            })),
        })),
    });

    return {
        quizzesData,
        resultsData,
        dbMock: {
            quizzes: {
                where: quizzesWhere,
                bulkGet: quizzesBulkGet,
            },
            results: {
                where: resultsWhere,
            },
        },
    };
});

vi.mock("@/db", () => ({ db: dbMock }));

vi.mock("@/lib/utils", () => ({
    hashAnswer: vi.fn(async (answer: string) => `hash-${answer}`),
    calculatePercentage: (correct: number, total: number): number =>
        total === 0 ? 0 : Math.round((correct / total) * 100),
    generateUUID: (): string => "test-uuid",
}));

describe("getTopicStudyQuestions", () => {
    beforeEach(() => {
        quizzesData.length = 0;
        resultsData.length = 0;
    });

    it("returns only questions from the specified category", async () => {
        quizzesData.push({
            id: "quiz-1",
            user_id: "user-a",
            title: "Mixed Quiz",
            description: "",
            created_at: 1,
            updated_at: 1,
            questions: [
                {
                    id: "q1",
                    category: "Networking",
                    question: "What is TCP?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
                {
                    id: "q2",
                    category: "Security",
                    question: "What is TLS?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
            ],
            tags: [],
            version: 1,
            deleted_at: null,
            quiz_hash: null,
        });

        resultsData.push({
            id: "result-1",
            quiz_id: "quiz-1",
            user_id: "user-a",
            timestamp: 1,
            mode: "zen",
            score: 50,
            time_taken_seconds: 120,
            answers: { q1: "b", q2: "b" }, // Both wrong
            flagged_questions: [],
            category_breakdown: {},
        });

        const data = await getTopicStudyQuestions("user-a", "Networking");

        // Should only include q1 (Networking), not q2 (Security)
        expect(data.questionIds).toContain("q1");
        expect(data.questionIds).not.toContain("q2");
        expect(data.missedCount).toBe(1);
        expect(data.totalUniqueCount).toBe(1);
    });

    it("correctly identifies flagged questions", async () => {
        quizzesData.push({
            id: "quiz-1",
            user_id: "user-a",
            title: "Test Quiz",
            description: "",
            created_at: 1,
            updated_at: 1,
            questions: [
                {
                    id: "q1",
                    category: "Networking",
                    question: "What is TCP?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
            ],
            tags: [],
            version: 1,
            deleted_at: null,
            quiz_hash: null,
        });

        resultsData.push({
            id: "result-1",
            quiz_id: "quiz-1",
            user_id: "user-a",
            timestamp: 1,
            mode: "zen",
            score: 100,
            time_taken_seconds: 120,
            answers: { q1: "a" }, // Correct answer
            flagged_questions: ["q1"], // But flagged for review
            category_breakdown: {},
        });

        const data = await getTopicStudyQuestions("user-a", "Networking");

        expect(data.questionIds).toContain("q1");
        expect(data.flaggedCount).toBe(1);
        expect(data.missedCount).toBe(0);
        expect(data.totalUniqueCount).toBe(1);
    });

    it("deduplicates questions that are both missed and flagged", async () => {
        quizzesData.push({
            id: "quiz-1",
            user_id: "user-a",
            title: "Test Quiz",
            description: "",
            created_at: 1,
            updated_at: 1,
            questions: [
                {
                    id: "q1",
                    category: "Networking",
                    question: "What is TCP?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
            ],
            tags: [],
            version: 1,
            deleted_at: null,
            quiz_hash: null,
        });

        resultsData.push({
            id: "result-1",
            quiz_id: "quiz-1",
            user_id: "user-a",
            timestamp: 1,
            mode: "zen",
            score: 0,
            time_taken_seconds: 120,
            answers: { q1: "b" }, // Wrong
            flagged_questions: ["q1"], // AND flagged
            category_breakdown: {},
        });

        const data = await getTopicStudyQuestions("user-a", "Networking");

        // Should only appear once even though it's both missed and flagged
        expect(data.questionIds).toEqual(["q1"]);
        expect(data.missedCount).toBe(1);
        expect(data.flaggedCount).toBe(1);
        expect(data.totalUniqueCount).toBe(1); // Not 2!
    });

    it("skips deleted quizzes", async () => {
        quizzesData.push({
            id: "quiz-1",
            user_id: "user-a",
            title: "Deleted Quiz",
            description: "",
            created_at: 1,
            updated_at: 1,
            questions: [
                {
                    id: "q1",
                    category: "Networking",
                    question: "What is TCP?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
            ],
            tags: [],
            version: 1,
            deleted_at: Date.now(), // DELETED
            quiz_hash: null,
        });

        resultsData.push({
            id: "result-1",
            quiz_id: "quiz-1",
            user_id: "user-a",
            timestamp: 1,
            mode: "zen",
            score: 0,
            time_taken_seconds: 120,
            answers: { q1: "b" },
            flagged_questions: [],
            category_breakdown: {},
        });

        const data = await getTopicStudyQuestions("user-a", "Networking");

        expect(data.questionIds).toEqual([]);
        expect(data.totalUniqueCount).toBe(0);
    });

    it("returns empty array when no matching questions exist", async () => {
        quizzesData.push({
            id: "quiz-1",
            user_id: "user-a",
            title: "Test Quiz",
            description: "",
            created_at: 1,
            updated_at: 1,
            questions: [
                {
                    id: "q1",
                    category: "Security",
                    question: "What is TLS?",
                    options: { a: "Protocol", b: "Device" },
                    correct_answer: "a",
                    explanation: "",
                },
            ],
            tags: [],
            version: 1,
            deleted_at: null,
            quiz_hash: null,
        });

        resultsData.push({
            id: "result-1",
            quiz_id: "quiz-1",
            user_id: "user-a",
            timestamp: 1,
            mode: "zen",
            score: 0,
            time_taken_seconds: 120,
            answers: { q1: "b" },
            flagged_questions: [],
            category_breakdown: {},
        });

        // No Networking questions exist
        const data = await getTopicStudyQuestions("user-a", "Networking");

        expect(data.questionIds).toEqual([]);
        expect(data.quizIds).toEqual([]);
        expect(data.totalUniqueCount).toBe(0);
    });
});
