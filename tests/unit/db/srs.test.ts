import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/db/index";
import {
    getDueQuestions,
    getDueCountsByBox,
    getSRSState,
    updateSRSState,
    clearSRSForUser,
} from "@/db/srs";
import type { SRSState } from "@/types/srs";

describe("SRS Database Operations", () => {
    const testUserId = "test-user-123";
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        await db.open();
        await db.srs.clear();
    });

    afterEach(async () => {
        await db.srs.clear();
    });

    describe("updateSRSState", () => {
        it("should create new state for first-time correct answer", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, true, now);

            const state = await getSRSState("q1", testUserId);
            expect(state).toBeDefined();
            expect(state?.box).toBe(2); // First correct → box 2
            expect(state?.consecutive_correct).toBe(1);
            expect(state?.last_reviewed).toBe(now);
            // Sync-facing fields that sync manager depends on
            expect(state?.synced).toBe(0); // New records start unsynced
            expect(state?.updated_at).toBe(now);
        });

        it("should create new state for first-time incorrect answer", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, false, now);

            const state = await getSRSState("q1", testUserId);
            expect(state).toBeDefined();
            expect(state?.box).toBe(1); // First incorrect → box 1
            expect(state?.consecutive_correct).toBe(0);
            // Verify sync fields
            expect(state?.synced).toBe(0);
            expect(state?.updated_at).toBe(now);
        });

        it("should promote box on subsequent correct answer", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, true, now);
            await updateSRSState("q1", testUserId, true, now + 1000);

            const state = await getSRSState("q1", testUserId);
            expect(state?.box).toBe(3); // 2 → 3
            expect(state?.consecutive_correct).toBe(2);
            // Verify updated_at reflects latest update
            expect(state?.updated_at).toBe(now + 1000);
            expect(state?.synced).toBe(0);
        });

        it("should demote box to 1 on incorrect answer", async () => {
            const now = Date.now();
            // Build up to box 3
            await updateSRSState("q1", testUserId, true, now);
            await updateSRSState("q1", testUserId, true, now + 1000);
            // Then fail
            await updateSRSState("q1", testUserId, false, now + 2000);

            const state = await getSRSState("q1", testUserId);
            expect(state?.box).toBe(1);
            expect(state?.consecutive_correct).toBe(0);
            // Verify sync fields after demotion
            expect(state?.updated_at).toBe(now + 2000);
            expect(state?.synced).toBe(0);
        });
    });


    describe("getDueQuestions", () => {
        it("should return questions where next_review <= now", async () => {
            const now = Date.now();
            const pastReview = now - MS_PER_DAY;
            const futureReview = now + MS_PER_DAY;

            // Add due question
            const dueState: SRSState = {
                question_id: "q-due",
                user_id: testUserId,
                box: 1,
                last_reviewed: pastReview - MS_PER_DAY,
                next_review: pastReview,
                consecutive_correct: 0,
            };
            await db.srs.add(dueState);

            // Add not-due question
            const notDueState: SRSState = {
                question_id: "q-not-due",
                user_id: testUserId,
                box: 3,
                last_reviewed: now,
                next_review: futureReview,
                consecutive_correct: 2,
            };
            await db.srs.add(notDueState);

            const due = await getDueQuestions(testUserId, now);
            expect(due).toHaveLength(1);
            expect(due[0]?.question_id).toBe("q-due");
        });

        it("should only return questions for the specified user", async () => {
            const now = Date.now();
            const pastReview = now - MS_PER_DAY;

            await db.srs.add({
                question_id: "q1",
                user_id: testUserId,
                box: 1,
                last_reviewed: pastReview,
                next_review: pastReview,
                consecutive_correct: 0,
            });

            await db.srs.add({
                question_id: "q1",
                user_id: "other-user",
                box: 1,
                last_reviewed: pastReview,
                next_review: pastReview,
                consecutive_correct: 0,
            });

            const due = await getDueQuestions(testUserId, now);
            expect(due).toHaveLength(1);
            expect(due[0]?.user_id).toBe(testUserId);
        });
    });

    describe("getDueCountsByBox", () => {
        it("should return counts grouped by box", async () => {
            const now = Date.now();
            const pastReview = now - MS_PER_DAY;

            // Add questions in different boxes
            await db.srs.bulkAdd([
                { question_id: "q1", user_id: testUserId, box: 1, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 0 },
                { question_id: "q2", user_id: testUserId, box: 1, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 0 },
                { question_id: "q3", user_id: testUserId, box: 2, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 1 },
                { question_id: "q4", user_id: testUserId, box: 5, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 5 },
            ]);

            const counts = await getDueCountsByBox(testUserId, now);
            expect(counts[1]).toBe(2);
            expect(counts[2]).toBe(1);
            expect(counts[3]).toBe(0);
            expect(counts[4]).toBe(0);
            expect(counts[5]).toBe(1);
        });
    });

    describe("clearSRSForUser", () => {
        it("should delete all SRS state for a user", async () => {
            const now = Date.now();

            await db.srs.bulkAdd([
                { question_id: "q1", user_id: testUserId, box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0 },
                { question_id: "q2", user_id: testUserId, box: 2, last_reviewed: now, next_review: now, consecutive_correct: 1 },
                { question_id: "q1", user_id: "other-user", box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0 },
            ]);

            await clearSRSForUser(testUserId);

            const remaining = await db.srs.toArray();
            expect(remaining).toHaveLength(1);
            expect(remaining[0]?.user_id).toBe("other-user");
        });
    });
});
