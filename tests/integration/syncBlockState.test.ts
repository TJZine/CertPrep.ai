import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { clearDatabase } from "@/db";
import {
    getSyncBlockState,
    setSyncBlockState,
    clearSyncBlockState,
} from "@/db/syncState";

describe("Integration: Sync Block State", () => {
    const userId = "test-user-block-state";

    beforeEach(async () => {
        // Only fake Date to avoid breaking IndexedDB async operations (setTimeout/setImmediate)
        vi.useFakeTimers({ toFake: ["Date"] });
        await clearDatabase();
    });

    afterEach(async () => {
        vi.useRealTimers();
        await clearDatabase();
    });

    it("should store and retrieve block state", async () => {
        // 1. Set block state
        await setSyncBlockState(userId, "results", "test_reason", 1000);

        // 2. Retrieve immediately
        const state = await getSyncBlockState(userId, "results");
        expect(state).not.toBeNull();
        expect(state?.reason).toBe("test_reason");
        expect(state?.ttlMs).toBe(1000);
    });

    it("should respect TTL expiration", async () => {
        // 1. Set block state with 1 hour TTL
        const ONE_HOUR = 60 * 60 * 1000;
        await setSyncBlockState(userId, "quizzes", "schema_drift", ONE_HOUR);

        // 2. Advance time by 30 mins
        vi.advanceTimersByTime(30 * 60 * 1000);

        // 3. Should still be blocked
        const stateMid = await getSyncBlockState(userId, "quizzes");
        expect(stateMid).not.toBeNull();

        // 4. Advance time past 1 hour
        vi.advanceTimersByTime(31 * 60 * 1000); // Total 61 mins

        // 5. Should be cleared
        const stateExpired = await getSyncBlockState(userId, "quizzes");
        expect(stateExpired).toBeNull();
    });

    it("should allow manual clearing of block state", async () => {
        // 1. Set block state
        await setSyncBlockState(userId, "results", "manual_clear", 50000);

        // 2. Verify set
        const stateBefore = await getSyncBlockState(userId, "results");
        expect(stateBefore).not.toBeNull();

        // 3. Clear manually
        await clearSyncBlockState(userId, "results");

        // 4. Verify cleared
        const stateAfter = await getSyncBlockState(userId, "results");
        expect(stateAfter).toBeNull();
    });

    it("should handle separate block states for different tables", async () => {
        // 1. Block both results and quizzes
        await setSyncBlockState(userId, "results", "r_reason", 1000);
        await setSyncBlockState(userId, "quizzes", "q_reason", 2000);

        // 2. Clear results only
        await clearSyncBlockState(userId, "results");

        // 3. Results should be cleared, Quizzes should still be blocked
        expect(await getSyncBlockState(userId, "results")).toBeNull();

        const quizState = await getSyncBlockState(userId, "quizzes");
        expect(quizState).not.toBeNull();
        expect(quizState?.reason).toBe("q_reason");
    });
});
