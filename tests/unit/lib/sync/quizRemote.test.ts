import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchUserQuizzes, upsertQuizzes, softDeleteQuizzes, DEFAULT_FETCH_LIMIT } from "@/lib/sync/quizRemote";
import { logger } from "@/lib/logger";
import { NIL_UUID } from "@/lib/constants";
import type { RemoteQuizInput } from "@/lib/sync/quizDomain";

// Mock Logger
vi.mock("@/lib/logger", () => ({
    logger: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

// Mock Supabase Client
// We need a complex mock because Supabase methods return a "Thenable" builder
// that can be chained AND awaited.
type MockBuilder = {
    then: (resolve: (value: { data: unknown; error: unknown }) => void) => void;
    [key: string]: unknown;
};

const mockBuilder: MockBuilder = {
    then: (resolve) => resolve({ data: [], error: null }),
};

// Add all methods to the builder and make them return itself
const methods = [
    "from", "select", "in", "order", "limit", "or", "upsert", "update", "eq"
];

methods.forEach((method) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockBuilder as any)[method] = vi.fn().mockReturnValue(mockBuilder);
});

vi.mock("@/lib/supabase/client", () => ({
    createClient: (): MockBuilder => mockBuilder,
}));

describe("quizRemote", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset implementations to return self
        methods.forEach((method) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fn = (mockBuilder as any)[method];
            if (fn && typeof fn.mockReturnValue === "function") {
                fn.mockReturnValue(mockBuilder);
            }
        });

        // Default "then" implementation for success
        mockBuilder.then = (resolve): void => { resolve({ data: [], error: null }); };
    });

    describe("fetchUserQuizzes", () => {
        it("fetches quizzes with default limit", async (): Promise<void> => {
            await fetchUserQuizzes({ userId: "user-1" });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).from).toHaveBeenCalledWith("quizzes");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).limit).toHaveBeenCalledWith(DEFAULT_FETCH_LIMIT);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).in).toHaveBeenCalledWith("user_id", ["user-1", NIL_UUID]);
        });

        it("applies updatedAfter filter correctly", async (): Promise<void> => {
            const dateStr = "2024-01-01T00:00:00.000Z";
            const lastId = "abc-123";

            await fetchUserQuizzes({ userId: "user-1", updatedAfter: dateStr, lastId });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).or).toHaveBeenCalledWith(
                `updated_at.gt.${dateStr},and(updated_at.eq.${dateStr},id.gt.${lastId})`
            );
        });

        it("falls back to epoch for invalid updatedAfter date", async (): Promise<void> => {
            await fetchUserQuizzes({ userId: "user-1", updatedAfter: "invalid-date" });

            expect(logger.error).toHaveBeenCalled();
            // Should fall back to epoch
            const epoch = "1970-01-01T00:00:00.000Z";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).or).toHaveBeenCalledWith(
                expect.stringContaining(`updated_at.gt.${epoch}`)
            );
        });

        it("returns empty array and logs error on failure", async (): Promise<void> => {
            const error = { message: "Network error" };
            // Override 'then' to return error
            mockBuilder.then = (resolve): void => { resolve({ data: null, error }); };

            const result = await fetchUserQuizzes({ userId: "user-1" });

            expect(result.data).toEqual([]);
            expect(result.error).toEqual(error);
            expect(logger.error).toHaveBeenCalledWith(
                "Failed to fetch quizzes from Supabase",
                expect.objectContaining({ error })
            );
        });
    });

    describe("upsertQuizzes", () => {
        it("returns early for empty input", async (): Promise<void> => {
            await upsertQuizzes("user-1", []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).from).not.toHaveBeenCalled();
        });

        it("upserts mapped payload", async (): Promise<void> => {
            const quizzes: RemoteQuizInput[] = [{
                id: "q1",
                user_id: "user-1",
                title: "Test Quiz",
                version: 1,
                questions: [],
            }];
            await upsertQuizzes("user-1", quizzes);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).from).toHaveBeenCalledWith("quizzes");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).upsert).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ user_id: "user-1" })]),
                { onConflict: "id" }
            );
        });

        it("logs error on failure", async (): Promise<void> => {
            const error = { message: "Upsert failed" };
            mockBuilder.then = (resolve): void => { resolve({ error, data: null }); };

            const quizzes: RemoteQuizInput[] = [{
                id: "q1",
                user_id: "user-1",
                title: "Test Quiz",
                version: 1,
                questions: [],
            }];
            await upsertQuizzes("user-1", quizzes);

            expect(logger.error).toHaveBeenCalledWith(
                "Failed to upsert quizzes to Supabase",
                expect.objectContaining({ error })
            );
        });
    });

    describe("softDeleteQuizzes", () => {
        it("returns early for empty input", async (): Promise<void> => {
            await softDeleteQuizzes("user-1", []);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).from).not.toHaveBeenCalled();
        });

        it("marks quizzes as deleted with timestamp", async (): Promise<void> => {
            const ids = ["q1", "q2"];
            await softDeleteQuizzes("user-1", ids);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).from).toHaveBeenCalledWith("quizzes");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).update).toHaveBeenCalledWith(
                expect.objectContaining({ deleted_at: expect.any(String) })
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).eq).toHaveBeenCalledWith("user_id", "user-1");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect((mockBuilder as any).in).toHaveBeenCalledWith("id", ids);
        });

        it("logs error on failure", async (): Promise<void> => {
            const error = { message: "Update failed" };
            mockBuilder.then = (resolve): void => { resolve({ error, data: null }); };

            const ids = ["q1"];
            await softDeleteQuizzes("user-1", ids);

            expect(logger.error).toHaveBeenCalledWith(
                "Failed to soft delete quizzes on Supabase",
                expect.objectContaining({ error })
            );
        });
    });
});
