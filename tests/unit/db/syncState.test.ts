import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/db";
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
        // Dexie auto-opens on first table access with fake-indexeddb
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
            expect(await db.syncState.get(`results:${testUserId}`)).toBeUndefined();
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
            await db.syncState.put({
                table: `results:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "exam-2-q25",
            });

            const cursor = await getSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("persists healed cursor to prevent repeated healing", async () => {
            await db.syncState.put({
                table: `results:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "corrupted-value",
            });

            // First call triggers healing
            await getSyncCursor(testUserId);

            // Verify persisted state was updated
            const state = await db.syncState.get(`results:${testUserId}`);
            expect(state?.lastId).toBe(NIL_UUID);
        });

        it("ignores the unscoped legacy results key and falls back to epoch", async () => {
            await db.syncState.put({
                table: "results",
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            });

            const cursor = await getSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
            expect(cursor.lastId).toBe(NIL_UUID);

            const migratedState = await db.syncState.get(`results:${testUserId}`);
            const legacyState = await db.syncState.get("results");
            expect(migratedState).toBeUndefined();
            expect(legacyState).toBeUndefined();
        });

        it("prefers the user-scoped cursor when both scoped and legacy keys exist", async () => {
            await db.syncState.bulkPut([
                {
                    table: `results:${testUserId}`,
                    lastSyncedAt: "2024-01-20T10:00:00.000Z",
                    synced: 1,
                    lastId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
                },
                {
                    table: "results",
                    lastSyncedAt: "2024-01-15T10:00:00.000Z",
                    synced: 1,
                    lastId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                },
            ]);

            const cursor = await getSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("2024-01-20T10:00:00.000Z");
            expect(cursor.lastId).toBe("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
            expect(await db.syncState.get("results")).toBeUndefined();
        });
    });

    describe("getQuizSyncCursor", () => {
        it("returns epoch cursor for missing user", async () => {
            const cursor = await getQuizSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
            expect(cursor.lastId).toBe(NIL_UUID);
        });

        it("returns stored cursor for valid data", async () => {
            const validTimestamp = "2024-01-15T10:00:00.000Z";
            const validUUID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
            await setQuizSyncCursor(validTimestamp, testUserId, validUUID);

            const cursor = await getQuizSyncCursor(testUserId);
            expect(cursor.timestamp).toBe(validTimestamp);
            expect(cursor.lastId).toBe(validUUID);
        });

        it("heals corrupted lastId (non-UUID format)", async () => {
            await db.syncState.put({
                table: `quizzes:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "quiz-slug-name",
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

        it("accepts non-UUID lastId", async () => {
            await db.syncState.put({
                table: `srs:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "exam-2-q25",
            });

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe("exam-2-q25");
        });

        it("accepts valid UUID lastId", async () => {
            const validUUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
            await setSRSSyncCursor("2024-01-15T10:00:00.000Z", testUserId, validUUID);

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe(validUUID);
        });

        it("heals empty lastId", async () => {
            await db.syncState.put({
                table: `srs:${testUserId}`,
                lastSyncedAt: "2024-01-15T10:00:00.000Z",
                synced: 1,
                lastId: "   ",
            });

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID);

            const state = await db.syncState.get(`srs:${testUserId}`);
            expect(state?.lastId).toBe(NIL_UUID);
        });

        it("accepts NIL_UUID as valid lastId", async () => {
            await setSRSSyncCursor("2024-01-15T10:00:00.000Z", testUserId, NIL_UUID);

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.lastId).toBe(NIL_UUID);

            // Verify it wasn't treated as corrupted
            const state = await db.syncState.get(`srs:${testUserId}`);
            expect(state?.lastId).toBe(NIL_UUID);
        });

        it("heals future timestamps", async () => {
            const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
            await db.syncState.put({
                table: `srs:${testUserId}`,
                lastSyncedAt: futureDate,
                synced: 1,
                lastId: NIL_UUID,
            });

            const cursor = await getSRSSyncCursor(testUserId);
            expect(cursor.timestamp).toBe("1970-01-01T00:00:00.000Z");
        });
    });

    describe("setSRSSyncCursor", () => {
        it("normalizes empty lastId to NIL_UUID", async () => {
            await setSRSSyncCursor("2024-01-15T10:00:00.000Z", testUserId, "   ");

            const state = await db.syncState.get(`srs:${testUserId}`);
            expect(state?.lastId).toBe(NIL_UUID);
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
