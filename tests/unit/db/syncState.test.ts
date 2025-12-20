import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/db/index";
import {
    getSyncCursor,
    setSyncCursor,
    getQuizSyncCursor,
    setQuizSyncCursor,
    getSRSSyncCursor,
    setSRSSyncCursor,
} from "@/db/syncState";
import { NIL_UUID } from "@/lib/constants";

describe("syncState cursor operations", () => {
    const testUserId = "test-user-uuid-1234";

    beforeEach(async () => {
        await db.open();
        await db.syncState.clear();
    });

    afterEach(async () => {
        await db.syncState.clear();
    });

    describe("getSyncCursor (Results)", () => {
        it("returns epoch cursor for missing user", async () => {
            const cursor = await getSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("returns stored cursor for valid data", async () => {
            const validTimestamp = "2024-01-15T10:00:00.000Z";
            const validUUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
            await setSyncCursor(validTimestamp, testUserId, validUUID);

            const cursor = await getSyncCursor(testUserId);
            expect(cursor.timestamp).toBe(validTimestamp);
            expect(cursor.lastId).toBe(validUUID);
        });

        it("heals corrupted lastId (non-UUID format)", async () => {
            // Manually insert corrupted data
            await db.syncState.put({
                table: `results:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "exam-2-q25", // Invalid: not a UUID
            });

            const cursor = await getSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID); // Healed to NIL
        });
    });

    describe("getQuizSyncCursor", () => {
        it("returns epoch cursor for missing user", async () => {
            const cursor = await getQuizSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("heals corrupted lastId (non-UUID format)", async () => {
            await db.syncState.put({
                table: `quizzes:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "quiz-slug-name", // Invalid: not a UUID
            });

            const cursor = await getQuizSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID);
        });
    });

    describe("getSRSSyncCursor", () => {
        it("returns epoch cursor for missing user", async () => {
            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("heals corrupted lastId (non-UUID format)", async () => {
            await db.syncState.put({
                table: `srs:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "exam-2-q25", // Invalid: matches Sentry error pattern
            });

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("accepts valid UUID lastId", async () => {
            const validUUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
            await setSRSSyncCursor("2024-01-15T10:00:00.000Z", testUserId, validUUID);

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe(validUUID);
        });

        it("heals future timestamps", async () => {
            const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours in future
            await db.syncState.put({
                table: `srs:${testUserId}`,
                lastSyncedAt: futureDate,
                synced: 1,
                lastId: NIL_UUID,
            });

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z"); // Healed to epoch
        });
    });

    describe("error handling", () => {
        it("setSyncCursor rejects invalid timestamps", async () => {
            await expect(
                setSyncCursor("not-a-date", testUserId)
            ).rejects.toThrow("Invalid timestamp");
        });

        it("setQuizSyncCursor rejects invalid timestamps", async () => {
            await expect(
                setQuizSyncCursor("garbage", testUserId)
            ).rejects.toThrow("Invalid timestamp");
        });

        it("setSRSSyncCursor rejects invalid timestamps", async () => {
            await expect(
                setSRSSyncCursor("invalid", testUserId)
            ).rejects.toThrow("Invalid timestamp");
        });
    });
});
