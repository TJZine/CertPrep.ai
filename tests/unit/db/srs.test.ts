import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { db } from "@/db/index";
import {
    getDueQuestions,
    getDueCountsByBox,
    getSRSState,
    updateSRSState,
    clearSRSForUser,
    getAllSRSStates,
    initializeSRSForResult,
} from "@/db/srs";

import type { Quiz, Question } from "@/types/quiz";
import type { Result } from "@/types/result";
import * as grading from "@/lib/grading";

// Mock grading logic
vi.mock("@/lib/grading", () => ({
    evaluateAnswer: vi.fn(),
}));

describe("SRS Database Operations", () => {
    const testUserId = "test-user-123";
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    beforeEach(async () => {
        await db.open();
        await db.srs.clear();
        vi.clearAllMocks();
    });

    afterEach(async () => {
        await db.srs.clear();
    });

    describe("updateSRSState", () => {
        it("should create new state for first-time Good (3) rating", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, 3, now);

            const state = await getSRSState("q1", testUserId);
            expect(state).toBeDefined();
            expect(state?.box).toBe(2); // First Good → box 2
            expect(state?.consecutive_correct).toBe(1);
            expect(state?.last_reviewed).toBe(now);
            expect(state?.synced).toBe(0);
            expect(state?.updated_at).toBe(now);
        });

        it("should create new state for first-time Again (1) rating", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, 1, now);

            const state = await getSRSState("q1", testUserId);
            expect(state).toBeDefined();
            expect(state?.box).toBe(1); // First Again → box 1
            expect(state?.consecutive_correct).toBe(0);
            expect(state?.synced).toBe(0);
            expect(state?.updated_at).toBe(now);
        });

        it("should promote box on subsequent Good (3) rating", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, 3, now);
            await updateSRSState("q1", testUserId, 3, now + 1000);

            const state = await getSRSState("q1", testUserId);
            expect(state?.box).toBe(3); // 2 → 3
            expect(state?.consecutive_correct).toBe(2);
            expect(state?.updated_at).toBe(now + 1000);
        });

        it("should demote box to 1 on Again (1) rating", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, 3, now);
            await updateSRSState("q1", testUserId, 3, now + 1000);
            await updateSRSState("q1", testUserId, 1, now + 2000);

            const state = await getSRSState("q1", testUserId);
            expect(state?.box).toBe(1);
            expect(state?.consecutive_correct).toBe(0);
            expect(state?.updated_at).toBe(now + 2000);
        });

        it("should keep box on Hard (2) rating", async () => {
            const now = Date.now();
            await updateSRSState("q1", testUserId, 3, now);
            await updateSRSState("q1", testUserId, 3, now + 1000);
            await updateSRSState("q1", testUserId, 2, now + 2000);

            const state = await getSRSState("q1", testUserId);
            expect(state?.box).toBe(3); // Stays at box 3
            expect(state?.consecutive_correct).toBe(0); // Resets streak
        });
    });

    describe("getDueQuestions", () => {
        it("should return questions where next_review <= now", async () => {
            const now = Date.now();
            const pastReview = now - MS_PER_DAY;
            const futureReview = now + MS_PER_DAY;

            await db.srs.add({
                question_id: "q-due",
                user_id: testUserId,
                box: 1,
                last_reviewed: pastReview - MS_PER_DAY,
                next_review: pastReview,
                consecutive_correct: 0,
                updated_at: now,
                synced: 0,
            });

            await db.srs.add({
                question_id: "q-not-due",
                user_id: testUserId,
                box: 3,
                last_reviewed: now,
                next_review: futureReview,
                consecutive_correct: 2,
                updated_at: now,
                synced: 0,
            });

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
                updated_at: now,
                synced: 0,
            });

            await db.srs.add({
                question_id: "q1",
                user_id: "other-user",
                box: 1,
                last_reviewed: pastReview,
                next_review: pastReview,
                consecutive_correct: 0,
                updated_at: now,
                synced: 0,
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

            await db.srs.bulkAdd([
                { question_id: "q1", user_id: testUserId, box: 1, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 0, updated_at: now, synced: 0 },
                { question_id: "q2", user_id: testUserId, box: 1, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 0, updated_at: now, synced: 0 },
                { question_id: "q3", user_id: testUserId, box: 2, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 1, updated_at: now, synced: 0 },
                { question_id: "q4", user_id: testUserId, box: 5, last_reviewed: pastReview, next_review: pastReview, consecutive_correct: 5, updated_at: now, synced: 0 },
            ]);

            const counts = await getDueCountsByBox(testUserId, now);
            expect(counts[1]).toBe(2);
            expect(counts[2]).toBe(1);
            expect(counts[3]).toBe(0);
            expect(counts[4]).toBe(0);
            expect(counts[5]).toBe(1);
        });
    });

    describe("getAllSRSStates", () => {
        it("should return all SRS states for the user", async () => {
            const now = Date.now();
            await db.srs.bulkAdd([
                { question_id: "q1", user_id: testUserId, box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0, updated_at: now, synced: 0 },
                { question_id: "q2", user_id: testUserId, box: 2, last_reviewed: now, next_review: now, consecutive_correct: 1, updated_at: now, synced: 0 },
                { question_id: "q3", user_id: "other", box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0, updated_at: now, synced: 0 },
            ]);

            const states = await getAllSRSStates(testUserId);
            expect(states).toHaveLength(2);
        });
    });

    describe("initializeSRSForResult", () => {
        const mockQuiz: Quiz = {
            id: "quiz-1",
            user_id: testUserId,
            title: "Test Quiz",
            description: "",
            questions: [
                { id: "q1", question: "Q1", options: {}, category: "C1", explanation: "" },
                { id: "q2", question: "Q2", options: {}, category: "C2", explanation: "" },
                { id: "q3", question: "Q3", options: {}, category: "C3", explanation: "" },
            ] as unknown as Question[],
            tags: [],
            version: 1,
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted_at: null,
            quiz_hash: null,
            last_synced_at: null,
            last_synced_version: null,
        } as unknown as Quiz;

        const mockResult: Result = {
            id: "res-1",
            user_id: testUserId,
            quiz_id: "quiz-1",
            timestamp: Date.now(),
            mode: "zen",
            score: 50,
            time_taken_seconds: 10,
            answers: {
                q1: "correct",
                q2: "incorrect",
            },
            question_ids: ["q1", "q2"], // only q1 and q2 answered
            flagged_questions: [],
            category_breakdown: {},
            synced: 0,
            mode_id: 1,
        } as unknown as Result;

        it("should update SRS state for answered questions only", async () => {
            vi.mocked(grading.evaluateAnswer).mockImplementation(async (q) => ({
                isCorrect: q.id === "q1",
                correctAnswer: "correct",
                category: "Test",
            }));

            const now = Date.now();
            await initializeSRSForResult(mockResult, mockQuiz, now);

            const q1State = await getSRSState("q1", testUserId);
            const q2State = await getSRSState("q2", testUserId);
            const q3State = await getSRSState("q3", testUserId);

            expect(q1State?.box).toBe(2); // Correct -> box 2
            expect(q2State?.box).toBe(1); // Incorrect -> box 1
            expect(q3State).toBeUndefined(); // Not answered
        });

        it("should skip unanswered questions even if in question_ids", async () => {
            const resultWithMissingAnswer = {
                ...mockResult,
                answers: { q1: "correct" }, // q2 is missing from answers
            };

            await initializeSRSForResult(resultWithMissingAnswer, mockQuiz);
            const q2State = await getSRSState("q2", testUserId);
            expect(q2State).toBeUndefined();
        });
    });

    describe("clearSRSForUser", () => {
        it("should delete all SRS state for a user", async () => {
            const now = Date.now();
            await db.srs.bulkAdd([
                { question_id: "q1", user_id: testUserId, box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0, updated_at: now, synced: 0 },
                { question_id: "q2", user_id: testUserId, box: 2, last_reviewed: now, next_review: now, consecutive_correct: 1, updated_at: now, synced: 0 },
                { question_id: "q1", user_id: "other-user", box: 1, last_reviewed: now, next_review: now, consecutive_correct: 0, updated_at: now, synced: 0 },
            ]);

            await clearSRSForUser(testUserId);

            const remaining = await db.srs.toArray();
            expect(remaining).toHaveLength(1);
            expect(remaining[0]?.user_id).toBe("other-user");
        });
    });
});
