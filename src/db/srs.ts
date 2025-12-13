import Dexie from "dexie";
import { db } from "./index";
import type { Quiz } from "@/types/quiz";
import type { Result } from "@/types/result";
import type { LeitnerBox, SRSState } from "@/types/srs";
import { calculateNextReview, promoteBox } from "@/lib/srs";
import { evaluateAnswer } from "@/lib/grading";

/**
 * Retrieves all questions due for review for a user.
 *
 * @param userId - The user's ID.
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns Array of SRSState records where next_review <= now.
 */
export async function getDueQuestions(
    userId: string,
    now: number = Date.now(),
): Promise<SRSState[]> {
    return db.srs
        .where("[user_id+next_review]")
        .between([userId, Dexie.minKey], [userId, now], true, true)
        .toArray();
}

/**
 * Gets the count of due questions grouped by Leitner box.
 *
 * @param userId - The user's ID.
 * @param now - Current timestamp (ms). Defaults to Date.now().
 * @returns Object mapping box number to count of due questions.
 */
export async function getDueCountsByBox(
    userId: string,
    now: number = Date.now(),
): Promise<Record<LeitnerBox, number>> {
    const dueQuestions = await getDueQuestions(userId, now);

    const counts: Record<LeitnerBox, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const state of dueQuestions) {
        counts[state.box]++;
    }

    return counts;
}

/**
 * Retrieves the SRS state for a specific question-user pair.
 *
 * @param questionId - The question's ID.
 * @param userId - The user's ID.
 * @returns The SRSState if it exists, undefined otherwise.
 */
export async function getSRSState(
    questionId: string,
    userId: string,
): Promise<SRSState | undefined> {
    return db.srs.get([questionId, userId]);
}

/**
 * Updates the SRS state for a question based on answer correctness.
 * Creates a new state if one doesn't exist.
 *
 * @param questionId - The question's ID.
 * @param userId - The user's ID.
 * @param wasCorrect - Whether the question was answered correctly.
 * @param now - Current timestamp (ms). Defaults to Date.now().
 */
export async function updateSRSState(
    questionId: string,
    userId: string,
    wasCorrect: boolean,
    now: number = Date.now(),
): Promise<void> {
    const existing = await getSRSState(questionId, userId);

    if (existing) {
        const newBox = promoteBox(existing.box, wasCorrect);
        const nextReview = calculateNextReview(newBox, wasCorrect, now);

        await db.srs.update([questionId, userId], {
            box: newBox,
            last_reviewed: now,
            next_review: nextReview,
            consecutive_correct: wasCorrect ? existing.consecutive_correct + 1 : 0,
            synced: 0,
            updated_at: now,
        });
    } else {
        // First time seeing this question - start at box 1 or 2 depending on correctness
        const initialBox: LeitnerBox = wasCorrect ? 2 : 1;
        const nextReview = calculateNextReview(initialBox, wasCorrect, now);

        const newState: SRSState = {
            question_id: questionId,
            user_id: userId,
            box: initialBox,
            last_reviewed: now,
            next_review: nextReview,
            consecutive_correct: wasCorrect ? 1 : 0,
            synced: 0,
            updated_at: now,
        };

        await db.srs.add(newState);
    }
}

/**
 * Initializes SRS state for all questions in a completed quiz result.
 * Creates or updates SRS entries based on whether each question was answered correctly.
 *
 * @param result - The completed quiz result.
 * @param quiz - The quiz that was taken.
 * @param now - Current timestamp (ms). Defaults to Date.now().
 */
export async function initializeSRSForResult(
    result: Result,
    quiz: Quiz,
    now: number = Date.now(),
): Promise<void> {
    // Determine which questions were actually answered (e.g., for Smart Rounds)
    const questionsToProcess = result.question_ids
        ? quiz.questions.filter((q) => result.question_ids?.includes(q.id))
        : quiz.questions;

    // Process each answered question
    await Promise.all(
        questionsToProcess.map(async (question) => {
            const userAnswer = result.answers[question.id];
            if (!userAnswer) return; // Skip unanswered questions

            const { isCorrect } = await evaluateAnswer(question, userAnswer);
            await updateSRSState(question.id, result.user_id, isCorrect, now);
        }),
    );
}

/**
 * Retrieves all SRS states for a user.
 *
 * @param userId - The user's ID.
 * @returns Array of all SRSState records for the user.
 */
export async function getAllSRSStates(userId: string): Promise<SRSState[]> {
    return db.srs.where("user_id").equals(userId).toArray();
}

/**
 * Deletes all SRS state for a user. Useful for testing or account reset.
 *
 * @param userId - The user's ID.
 */
export async function clearSRSForUser(userId: string): Promise<void> {
    await db.srs.where("user_id").equals(userId).delete();
}
