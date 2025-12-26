import { logger } from "@/lib/logger";

/** Storage key for the array of question IDs in a flashcard session */
export const FLASHCARD_SESSION_KEY = "flashcardSessionQuestions";

/** Storage key for the quiz ID associated with the flashcard session */
export const FLASHCARD_QUIZ_ID_KEY = "flashcardSessionQuizId";

/**
 * Save flashcard session question IDs to sessionStorage.
 * Returns false if storage is unavailable.
 */
export function saveFlashcardSession(
    questionIds: string[],
    quizId?: string
): boolean {
    if (typeof window === "undefined" || !window.sessionStorage) return false;
    try {
        window.sessionStorage.setItem(
            FLASHCARD_SESSION_KEY,
            JSON.stringify(questionIds)
        );
        if (quizId) {
            window.sessionStorage.setItem(FLASHCARD_QUIZ_ID_KEY, quizId);
        }
        return true;
    } catch (error) {
        logger.warn("Failed to save flashcard session to sessionStorage", error);
        return false;
    }
}

/**
 * Retrieve flashcard session question IDs from sessionStorage.
 * Returns null if not found or storage is unavailable.
 */
export function getFlashcardSession(): string[] | null {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    try {
        const stored = window.sessionStorage.getItem(FLASHCARD_SESSION_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored) as unknown;
        if (!Array.isArray(parsed)) return null;
        return parsed as string[];
    } catch (error) {
        logger.warn("Failed to get flashcard session from sessionStorage", error);
        return null;
    }
}

/**
 * Retrieve the quiz ID associated with the current flashcard session.
 */
export function getFlashcardQuizId(): string | null {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    try {
        return window.sessionStorage.getItem(FLASHCARD_QUIZ_ID_KEY);
    } catch (error) {
        logger.warn("Failed to get flashcard quiz ID from sessionStorage", error);
        return null;
    }
}

/**
 * Clear flashcard session state from sessionStorage.
 * Swallows storage exceptions to avoid crashing flows.
 */
export function clearFlashcardSession(): void {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    try {
        window.sessionStorage.removeItem(FLASHCARD_SESSION_KEY);
        window.sessionStorage.removeItem(FLASHCARD_QUIZ_ID_KEY);
    } catch (error) {
        logger.warn("Failed to clear flashcard session from sessionStorage", error);
    }
}
