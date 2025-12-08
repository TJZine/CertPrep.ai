
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useQuizzes, useQuiz } from "@/hooks/useDatabase";
import { db } from "@/db";
import { NIL_UUID } from "@/lib/constants";

describe("useDatabase Hooks", () => {
    const userId = "user-123";
    const otherUserId = "user-456";

    beforeEach(async () => {
        await db.quizzes.clear();
        await db.quizzes.bulkAdd([
            {
                id: "quiz-1",
                user_id: userId,
                title: "My Quiz",
                description: "Desc",
                questions: [],
                created_at: Date.now(),
                updated_at: Date.now(),
                version: 1,
                tags: [],
            },
            {
                id: "quiz-public",
                user_id: NIL_UUID,
                title: "Public Quiz",
                description: "Desc",
                questions: [],
                created_at: Date.now(),
                updated_at: Date.now(),
                version: 1,
                tags: [],
            },
            {
                id: "quiz-other",
                user_id: otherUserId,
                title: "Other Quiz",
                description: "Desc",
                questions: [],
                created_at: Date.now(),
                updated_at: Date.now(),
                version: 1,
                tags: [],
            },
        ]);
    });

    describe("useQuizzes", () => {
        it("should return user's own quizzes", async () => {
            const { result } = renderHook(() => useQuizzes(userId));

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.quizzes).toHaveLength(1);
            expect(result.current.quizzes?.[0]?.id).toBe("quiz-1");
        });

        it("should return empty list for unknown user", async () => {
            const { result } = renderHook(() => useQuizzes("unknown"));

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.quizzes).toHaveLength(0);
        });
    });

    describe("useQuiz", () => {
        it("should return user owned quiz", async () => {
            const { result } = renderHook(() => useQuiz("quiz-1", userId));

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.quiz).toBeDefined();
            expect(result.current.quiz?.id).toBe("quiz-1");
        });

        it("should return public quiz (NIL_UUID)", async () => {
            const { result } = renderHook(() => useQuiz("quiz-public", userId));

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.quiz).toBeDefined();
            expect(result.current.quiz?.id).toBe("quiz-public");
        });

        it("should NOT return other user's quiz", async () => {
            const { result } = renderHook(() => useQuiz("quiz-other", userId));

            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.quiz).toBeUndefined(); // Hook returns undefined if not found/unauthorized
        });

        it("should return undefined if id/userId missing", async () => {
            const { result } = renderHook(() => useQuiz(undefined, undefined));
            expect(result.current.quiz).toBeUndefined();
            expect(result.current.isLoading).toBe(true);
        });
    });
});
