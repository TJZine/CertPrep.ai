import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from "vitest";

import { useState, useEffect } from "react";
vi.mock("dexie-react-hooks", () => ({
    useLiveQuery: vi.fn((querier: () => Promise<unknown> | unknown, deps = []) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [data, setData] = useState<any>(undefined);

        useEffect(() => {
            let isMounted = true;
            Promise.resolve(querier())
                .then((result) => {
                    if (isMounted) setData(result);
                })
                .catch(() => {
                    if (isMounted) setData(undefined);
                });

            return (): void => { isMounted = false; };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, deps);

        return data;
    }),
}));

import {
    useInitializeDatabase,
    useQuizzes,
    useQuiz,
    useResults,
    useResult,
    useQuizResults,
    useResultWithHydratedQuiz,
    useQuizWithStats
} from "@/hooks/useDatabase";
import { db, initializeDatabase } from "@/db";
import { isSRSQuiz, getQuizStats } from "@/db/quizzes";
import { hydrateAggregatedQuiz } from "@/db/aggregatedQuiz";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";

vi.mock("@/db", () => ({
    db: {
        quizzes: {
            where: vi.fn().mockReturnThis(),
            equals: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),
            toArray: vi.fn(),
            get: vi.fn(),
            bulkAdd: vi.fn(),
            clear: vi.fn(),
        },
        results: {
            where: vi.fn().mockReturnThis(),
            equals: vi.fn().mockReturnThis(),
            filter: vi.fn().mockReturnThis(),

            get: vi.fn(),
            bulkAdd: vi.fn(),
            clear: vi.fn(),
        },
    },
    initializeDatabase: vi.fn(),
}));

vi.mock("@/db/quizzes", () => ({
    isSRSQuiz: vi.fn().mockReturnValue(false),
    getQuizStats: vi.fn().mockResolvedValue(null),
    sortQuizzesByNewest: vi.fn((q: unknown) => q),
}));

vi.mock("@/db/aggregatedQuiz", () => ({
    hydrateAggregatedQuiz: vi.fn(),
}));

describe("useDatabase hooks (Unit Layer)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("useInitializeDatabase", () => {
        it("initializes successfully", async () => {
            (initializeDatabase as unknown as Mock).mockResolvedValue(undefined);
            const { result } = renderHook(() => useInitializeDatabase());

            expect(result.current.isInitialized).toBe(false);

            await waitFor(() => {
                expect(result.current.isInitialized).toBe(true);
            });
            expect(result.current.error).toBeNull();
        });

        it("handles initialization error", async () => {
            const error = new Error("Init failed");
            (initializeDatabase as unknown as Mock).mockRejectedValue(error);
            const { result } = renderHook(() => useInitializeDatabase());

            await waitFor(() => {
                expect(result.current.error).toEqual(error);
            });
            expect(result.current.isInitialized).toBe(false);
        });
    });

    describe("useQuizzes", () => {
        it("returns loading state if no userId", () => {
            const { result } = renderHook(() => useQuizzes(undefined));
            expect(result.current.isLoading).toBe(true);
        });

        it("fetches user quizzes excluding SRS by default", async () => {
            const mockQuizzes = [{ id: "1", user_id: "user1", title: "Q1" }];
            (db.quizzes.toArray as Mock).mockResolvedValue(mockQuizzes);

            const { result } = renderHook(() => useQuizzes("user1"));

            await waitFor(() => {
                expect(result.current.quizzes).toEqual(mockQuizzes);
                expect(result.current.isLoading).toBe(false);
            });
        });

        it("handles fetch errors securely", async () => {
            (db.quizzes.toArray as Mock).mockRejectedValue(new Error("DB error"));

            const { result } = renderHook(() => useQuizzes("user1"));

            await waitFor(() => {
                expect(result.current.quizzes).toEqual([]);
                expect(result.current.error).toBeDefined();
                expect(result.current.error?.message).toBe("DB error");
            });
        });
    });

    describe("useQuiz", () => {
        it("returns undefined if id or userId is missing", () => {
            const { result } = renderHook(() => useQuiz(undefined, "user1"));
            expect(result.current.quiz).toBeUndefined();
            expect(result.current.isLoading).toBe(true);
        });

        it("returns undefined/null if quiz not found", async () => {
            (db.quizzes.get as Mock).mockResolvedValue(null);
            const { result } = renderHook(() => useQuiz("q1", "user1"));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                // hook turns null into undefined with `quiz: id && userId && quiz ? quiz : undefined` inside useQuiz internal ternary
                expect(result.current.quiz).toBeUndefined();
            });
        });

        it("returns quiz if user owns it", async () => {
            const mockQuiz = { id: "q1", user_id: "user1" };
            (db.quizzes.get as Mock).mockResolvedValue(mockQuiz);

            const { result } = renderHook(() => useQuiz("q1", "user1"));

            await waitFor(() => {
                expect(result.current.quiz).toEqual(mockQuiz as unknown as Quiz);
                expect(result.current.isLoading).toBe(false);
            });
        });

        it("returns undefined if quiz is marked deleted", async () => {
            const mockQuiz = { id: "q1", user_id: "user1", deleted_at: "some-date" };
            (db.quizzes.get as Mock).mockResolvedValue(mockQuiz);

            const { result } = renderHook(() => useQuiz("q1", "user1"));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                // deleted quizzes return null from internal hook method
                expect(result.current.quiz).toBeUndefined();
            });
        });
    });

    describe("useQuizWithStats", () => {
        it("returns undefined if id/userId missing", () => {
            const { result } = renderHook(() => useQuizWithStats(undefined, "user1"));
            expect(result.current.isLoading).toBe(true);
        });

        it("returns stats attached to quiz", async () => {
            const mockQuiz = { id: "q1", user_id: "user1" };
            const mockStats = { played: 5 };
            (db.quizzes.get as Mock).mockResolvedValue(mockQuiz);
            (getQuizStats as unknown as Mock).mockResolvedValue(mockStats);

            const { result } = renderHook(() => useQuizWithStats("q1", "user1"));

            await waitFor(() => {
                expect(result.current.quiz).toEqual(mockQuiz as unknown as Quiz);
                expect(result.current.stats).toEqual(mockStats);
            });
        });

        it("handles deleted quiz returning no stats", async () => {
            const mockQuiz = { id: "q1", user_id: "user1", deleted_at: "some-date" };
            (db.quizzes.get as Mock).mockResolvedValue(mockQuiz);

            const { result } = renderHook(() => useQuizWithStats("q1", "user1"));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.quiz).toBeUndefined();
            });
        });
    });

    describe("useResults", () => {
        it("fetches ordered results for user", async () => {
            const mockResults = [{ id: "r1", user_id: "user1" }];
            (db.results.orderBy as Mock).mockReturnValue({ reverse: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue(mockResults) });

            const { result } = renderHook(() => useResults("user1"));

            await waitFor(() => {
                expect(result.current.results).toEqual([...mockResults].reverse());
            });
        });
    });

    describe("useResult", () => {
        it("fetches a specific result", async () => {
            const mockResult = { id: "r1", user_id: "user1" };
            (db.results.get as Mock).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useResult("r1", "user1"));

            await waitFor(() => {
                expect(result.current.result).toEqual(mockResult as unknown as Result);
            });
        });

        it("returns null for deleted result inside useResult", async () => {
            const mockResult = { id: "r1", user_id: "user1", deleted_at: "deleted" };
            (db.results.get as Mock).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useResult("r1", "user1"));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.result).toBeNull();
            });
        });

        it("returns null if user does not own result", async () => {
            const mockResult = { id: "r1", user_id: "otherUser" };
            (db.results.get as Mock).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useResult("r1", "user1"));

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
                expect(result.current.result).toBeNull();
            });
        });
    });

    describe("useQuizResults", () => {
        it("fetches results for a specific quiz", async () => {
            const mockResults = [{ id: "r1", user_id: "user1", quiz_id: "q1" }];
            (db.results.orderBy as Mock).mockReturnValue({ reverse: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue(mockResults) });

            const { result } = renderHook(() => useQuizResults("q1", "user1"));

            await waitFor(() => {
                expect(result.current.results).toEqual([...mockResults].reverse());
            });
        });
    });

    describe("useResultWithHydratedQuiz", () => {
        it("resolves normal non-SRS quiz successfully", async () => {
            const mockResult = {
                id: "r1",
                user_id: "user1",
                quiz_id: "q1",
            };

            const mockBaseQuiz = {
                id: "q1",
                user_id: "user1",
                title: "Base title",
                questions: [{ id: "some_q_id" }]
            };

            (db.results.get as Mock).mockResolvedValue(mockResult);
            (db.quizzes.get as Mock).mockResolvedValue(mockBaseQuiz);
            (isSRSQuiz as unknown as Mock).mockReturnValue(false);

            const { result } = renderHook(() => useResultWithHydratedQuiz("r1", "user1"));

            await waitFor(() => {
                expect(result.current.quiz).toEqual(mockBaseQuiz as unknown as Quiz);
                expect(result.current.isHydrating).toBe(false);
            });
        });

        it("hydrates SRS quiz with synthetic questions", async () => {
            const mockResult = {
                id: "r1",
                user_id: "user1",
                quiz_id: "q1",
                question_ids: ["id1", "id2"],
                category_breakdown: { "Networking": 1 }
            };

            const mockBaseQuiz = {
                id: "q1",
                user_id: "user1",
                title: "Base title",
                questions: []
            };

            const mockSyntheticQuiz = {
                ...mockBaseQuiz,
                title: "Topic Study: Networking",
                questions: [{ id: "id1" }, { id: "id2" }]
            };

            (db.results.get as Mock).mockResolvedValue(mockResult);
            (db.quizzes.get as Mock).mockResolvedValue(mockBaseQuiz);

            (isSRSQuiz as unknown as Mock).mockReturnValue(true);
            (hydrateAggregatedQuiz as unknown as Mock).mockResolvedValue({ syntheticQuiz: mockSyntheticQuiz });

            const { result } = renderHook(() => useResultWithHydratedQuiz("r1", "user1"));

            await waitFor(() => {
                expect(result.current.quiz).toEqual(mockSyntheticQuiz as unknown as Quiz);
                expect(result.current.isHydrating).toBe(false);
            });
        });

        it("handles hydrateAggregatedQuiz failures gracefully", async () => {
            const mockResult = {
                id: "r1",
                user_id: "user1",
                quiz_id: "q1",
                question_ids: ["id1", "id2"]
            };

            const mockBaseQuiz = {
                id: "q1",
                user_id: "user1",
                title: "Base title",
                questions: []
            };

            (db.results.get as Mock).mockResolvedValue(mockResult);
            (db.quizzes.get as Mock).mockResolvedValue(mockBaseQuiz);

            (isSRSQuiz as unknown as Mock).mockReturnValue(true);
            (hydrateAggregatedQuiz as unknown as Mock).mockRejectedValue(new Error("Failed"));

            const { result } = renderHook(() => useResultWithHydratedQuiz("r1", "user1"));

            await waitFor(() => {
                expect(result.current.quiz).toEqual(mockBaseQuiz as unknown as Quiz);
                expect(result.current.isHydrating).toBe(false);
            });
        });
    });
});
