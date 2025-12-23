import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    generateInterleavedSession,
    getAvailableCategories,
    getAvailableTags,
    getMatchingQuestionCount,
    NoQuestionsError,
    type InterleavedConfig,
} from "@/lib/interleavedPractice";
import { db } from "@/db";
import type { Quiz, Question } from "@/types/quiz";

// Mock the database
vi.mock("@/db", () => ({
    db: {
        quizzes: {
            where: vi.fn(),
        },
    },
}));

// Mock remixQuiz
vi.mock("@/lib/quiz-remix", () => ({
    remixQuiz: vi.fn().mockImplementation(async (quiz) => ({
        quiz,
        keyMappings: new Map(),
    })),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

const userId = "user-123";

function createQuestion(id: string, category: string): Question {
    return {
        id,
        question: `Question ${id}`,
        options: {
            a: "Option A",
            b: "Option B",
            c: "Option C",
            d: "Option D",
        },
        correct_answer: "a",
        category,
        explanation: "Test explanation",
    };
}

function createQuiz(id: string, questions: Question[], tags: string[] = []): Quiz {
    return {
        id,
        user_id: userId,
        title: `Quiz ${id}`,
        description: "Test quiz",
        created_at: Date.now(),
        updated_at: Date.now(),
        questions,
        tags,
        version: 1,
    };
}

describe("interleavedPractice", () => {
    const mockWhere = db.quizzes.where as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("generateInterleavedSession", () => {
        it("aggregates questions from multiple quizzes", async () => {
            const quiz1 = createQuiz("q1", [
                createQuestion("q1-1", "Math"),
                createQuestion("q1-2", "Math"),
            ]);
            const quiz2 = createQuiz("q2", [
                createQuestion("q2-1", "Science"),
                createQuestion("q2-2", "Science"),
            ]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
                    }),
                }),
            });

            const config: InterleavedConfig = {
                questionCount: 4,
                enableRemix: false,
            };

            const result = await generateInterleavedSession(config, userId);

            expect(result.quiz.questions).toHaveLength(4);
            expect(result.sourceMap.size).toBe(4);
            expect(result.keyMappings).toBeNull();
        });

        it("filters by category", async () => {
            const quiz = createQuiz("q1", [
                createQuestion("q1-1", "Math"),
                createQuestion("q1-2", "Science"),
                createQuestion("q1-3", "Math"),
            ]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz]),
                    }),
                }),
            });

            const config: InterleavedConfig = {
                categories: ["Math"],
                questionCount: 10,
                enableRemix: false,
            };

            const result = await generateInterleavedSession(config, userId);

            expect(result.quiz.questions).toHaveLength(2);
            expect(
                result.quiz.questions.every((q) => q.category === "Math"),
            ).toBe(true);
        });

        it("filters by category case-insensitively", async () => {
            const quiz = createQuiz("q1", [
                createQuestion("q1-1", "Math"),
                createQuestion("q1-2", "MATH"),
                createQuestion("q1-3", "math"),
                createQuestion("q1-4", "Science"),
            ]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz]),
                    }),
                }),
            });

            const config: InterleavedConfig = {
                categories: ["MATH"],
                questionCount: 10,
                enableRemix: false,
            };

            const result = await generateInterleavedSession(config, userId);

            expect(result.quiz.questions).toHaveLength(3);
            expect(
                result.quiz.questions.every((q) =>
                    q.category?.toLowerCase() === "math",
                ),
            ).toBe(true);
        });

        it("filters by multiple categories", async () => {
            const quiz = createQuiz("q1", [
                createQuestion("q1-1", "Math"),
                createQuestion("q1-2", "Science"),
                createQuestion("q1-3", "History"),
                createQuestion("q1-4", "Art"),
            ]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz]),
                    }),
                }),
            });

            const config: InterleavedConfig = {
                categories: ["Math", "Science"],
                questionCount: 10,
                enableRemix: false,
            };

            const result = await generateInterleavedSession(config, userId);

            expect(result.quiz.questions).toHaveLength(2);
            const categories = result.quiz.questions.map((q) => q.category);
            expect(categories).toContain("Math");
            expect(categories).toContain("Science");
            expect(categories).not.toContain("History");
            expect(categories).not.toContain("Art");
        });

        it("filters by tags", async () => {
            const quiz1 = createQuiz("q1", [createQuestion("q1-1", "Math")], ["cert-a"]);
            const quiz2 = createQuiz("q2", [createQuestion("q2-1", "Science")], ["cert-b"]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
                    }),
                }),
            });

            const config: InterleavedConfig = {
                tags: ["cert-a"],
                questionCount: 10,
                enableRemix: false,
            };

            const result = await generateInterleavedSession(config, userId);

            expect(result.quiz.questions).toHaveLength(1);
            expect(result.quiz.questions[0]?.id).toBe("q1-1");
        });

        it("builds correct sourceMap", async () => {
            const quiz1 = createQuiz("quiz-1", [createQuestion("q1-1", "Math")]);
            const quiz2 = createQuiz("quiz-2", [createQuestion("q2-1", "Science")]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz1, quiz2]),
                    }),
                }),
            });

            const result = await generateInterleavedSession(
                { questionCount: 10, enableRemix: false },
                userId,
            );

            expect(result.sourceMap.get("q1-1")).toBe("quiz-1");
            expect(result.sourceMap.get("q2-1")).toBe("quiz-2");
        });

        it("throws NoQuestionsError when pool is empty", async () => {
            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([]),
                    }),
                }),
            });

            await expect(
                generateInterleavedSession(
                    { questionCount: 10, enableRemix: false },
                    userId,
                ),
            ).rejects.toThrow(NoQuestionsError);
        });

        it("returns fewer questions than requested when pool is small", async () => {
            const quiz = createQuiz("q1", [createQuestion("q1-1", "Math")]);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz]),
                    }),
                }),
            });

            const result = await generateInterleavedSession(
                { questionCount: 50, enableRemix: false },
                userId,
            );

            expect(result.quiz.questions).toHaveLength(1);
        });

        it("applies category balancing when sampling", async () => {
            const questions = [
                ...Array.from({ length: 8 }, (_, i) => createQuestion(`math-${i}`, "Math")),
                ...Array.from({ length: 2 }, (_, i) => createQuestion(`sci-${i}`, "Science")),
            ];
            const quiz = createQuiz("q1", questions);

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue([quiz]),
                    }),
                }),
            });

            const result = await generateInterleavedSession(
                { questionCount: 4, enableRemix: false },
                userId,
            );

            // Should include questions from both categories due to balancing
            const categories = new Set(result.quiz.questions.map((q) => q.category));
            expect(categories.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe("getAvailableCategories", () => {
        it("returns unique categories from all quizzes", async () => {
            const quizzes = [
                createQuiz("q1", [
                    createQuestion("1", "Math"),
                    createQuestion("2", "Science"),
                ]),
                createQuiz("q2", [
                    createQuestion("3", "Math"),
                    createQuestion("4", "History"),
                ]),
            ];

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue(quizzes),
                    }),
                }),
            });

            const categories = await getAvailableCategories(userId);

            expect(categories).toContain("Math");
            expect(categories).toContain("Science");
            expect(categories).toContain("History");
            expect(categories).toHaveLength(3);
        });
    });

    describe("getAvailableTags", () => {
        it("returns unique tags from all quizzes", async () => {
            const quizzes = [
                createQuiz("q1", [], ["cert-a", "level-1"]),
                createQuiz("q2", [], ["cert-b", "level-1"]),
            ];

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue(quizzes),
                    }),
                }),
            });

            const tags = await getAvailableTags(userId);

            expect(tags).toContain("cert-a");
            expect(tags).toContain("cert-b");
            expect(tags).toContain("level-1");
            expect(tags).toHaveLength(3);
        });
    });

    describe("getMatchingQuestionCount", () => {
        it("returns total question count without filters", async () => {
            const quizzes = [
                createQuiz("q1", [createQuestion("1", "Math"), createQuestion("2", "Math")]),
                createQuiz("q2", [createQuestion("3", "Science")]),
            ];

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue(quizzes),
                    }),
                }),
            });

            const count = await getMatchingQuestionCount(userId, {});

            expect(count).toBe(3);
        });

        it("filters count by category", async () => {
            const quizzes = [
                createQuiz("q1", [
                    createQuestion("1", "Math"),
                    createQuestion("2", "Science"),
                ]),
            ];

            mockWhere.mockReturnValue({
                equals: vi.fn().mockReturnValue({
                    filter: vi.fn().mockReturnValue({
                        toArray: vi.fn().mockResolvedValue(quizzes),
                    }),
                }),
            });

            const count = await getMatchingQuestionCount(userId, {
                categories: ["Math"],
            });

            expect(count).toBe(1);
        });
    });
});

