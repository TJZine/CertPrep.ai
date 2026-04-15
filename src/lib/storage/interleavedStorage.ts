import { logger } from "@/lib/logger";
import type { Quiz } from "@/types/quiz";

/** Storage key for the virtual quiz data */
export const INTERLEAVED_QUIZ_KEY = "interleavedQuiz";
/** Storage key for source map (questionId → quizId) */
export const INTERLEAVED_SOURCE_MAP_KEY = "interleavedSourceMap";
/** Storage key for key mappings (for remix answer translation) */
export const INTERLEAVED_KEY_MAPPINGS_KEY = "interleavedKeyMappings";

export const INTERLEAVED_STATE_KEYS = [
    INTERLEAVED_QUIZ_KEY,
    INTERLEAVED_SOURCE_MAP_KEY,
    INTERLEAVED_KEY_MAPPINGS_KEY,
] as const;

/**
 * Serializable state for an interleaved practice session.
 */
export interface InterleavedSessionState {
    /** The virtual quiz containing aggregated questions */
    quiz: Quiz;
    /** Maps questionId → source quizId */
    sourceMap: Record<string, string>;
    /** Maps questionId → key mapping (for remix translation) */
    keyMappings: Record<string, Record<string, string>> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
    return (
        isRecord(value) &&
        Object.values(value).every((entry) => typeof entry === "string")
    );
}

function isQuizQuestion(value: unknown): boolean {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.category === "string" &&
        typeof value.question === "string" &&
        typeof value.explanation === "string" &&
        isStringRecord(value.options)
    );
}

function isQuiz(value: unknown): value is Quiz {
    return (
        isRecord(value) &&
        typeof value.id === "string" &&
        typeof value.user_id === "string" &&
        typeof value.title === "string" &&
        typeof value.description === "string" &&
        typeof value.created_at === "number" &&
        Array.isArray(value.questions) &&
        value.questions.every(isQuizQuestion) &&
        Array.isArray(value.tags) &&
        value.tags.every((tag) => typeof tag === "string") &&
        typeof value.version === "number"
    );
}

function isKeyMappingsRecord(
    value: unknown,
): value is Record<string, Record<string, string>> {
    return (
        isRecord(value) &&
        Object.values(value).every((entry) => isStringRecord(entry))
    );
}

/**
 * Converts a Map to a plain object for JSON serialization.
 */
function mapToObject<V>(map: Map<string, V>): Record<string, V> {
    const obj: Record<string, V> = {};
    map.forEach((value, key) => {
        obj[key] = value;
    });
    return obj;
}

/**
 * Saves interleaved session state to sessionStorage.
 * Handles serialization of Maps to objects.
 */
export function saveInterleavedState(
    quiz: Quiz,
    sourceMap: Map<string, string>,
    keyMappings: Map<string, Record<string, string>> | null,
): void {
    if (typeof window === "undefined" || !window.sessionStorage) return;

    try {
        sessionStorage.setItem(INTERLEAVED_QUIZ_KEY, JSON.stringify(quiz));
        sessionStorage.setItem(
            INTERLEAVED_SOURCE_MAP_KEY,
            JSON.stringify(mapToObject(sourceMap)),
        );
        if (keyMappings) {
            sessionStorage.setItem(
                INTERLEAVED_KEY_MAPPINGS_KEY,
                JSON.stringify(mapToObject(keyMappings)),
            );
        } else {
            sessionStorage.removeItem(INTERLEAVED_KEY_MAPPINGS_KEY);
        }
    } catch (error) {
        logger.error("Failed to save interleaved state to sessionStorage", { error });
    }
}

/**
 * Loads interleaved session state from sessionStorage.
 * Returns null if no session exists or if parsing fails.
 */
export function loadInterleavedState(): InterleavedSessionState | null {
    if (typeof window === "undefined" || !window.sessionStorage) return null;

    try {
        const quizJson = sessionStorage.getItem(INTERLEAVED_QUIZ_KEY);
        const sourceMapJson = sessionStorage.getItem(INTERLEAVED_SOURCE_MAP_KEY);

        if (!quizJson || !sourceMapJson) {
            return null;
        }

        const quiz = JSON.parse(quizJson);
        const sourceMap = JSON.parse(sourceMapJson);

        if (!isQuiz(quiz) || !isStringRecord(sourceMap)) {
            clearInterleavedState();
            return null;
        }

        let keyMappings: Record<string, Record<string, string>> | null = null;
        const keyMappingsJson = sessionStorage.getItem(INTERLEAVED_KEY_MAPPINGS_KEY);
        if (keyMappingsJson) {
            try {
                const parsedKeyMappings = JSON.parse(keyMappingsJson);
                if (isKeyMappingsRecord(parsedKeyMappings)) {
                    keyMappings = parsedKeyMappings;
                } else {
                    sessionStorage.removeItem(INTERLEAVED_KEY_MAPPINGS_KEY);
                }
            } catch (error) {
                logger.warn("Failed to load interleaved key mappings from sessionStorage", {
                    error,
                });
                sessionStorage.removeItem(INTERLEAVED_KEY_MAPPINGS_KEY);
            }
        }

        return { quiz, sourceMap, keyMappings };
    } catch (error) {
        logger.warn("Failed to load interleaved state from sessionStorage", { error });
        clearInterleavedState();
        return null;
    }
}

/**
 * Clears all interleaved session state from sessionStorage.
 */
export function clearInterleavedState(): void {
    if (typeof window === "undefined" || !window.sessionStorage) return;

    try {
        INTERLEAVED_STATE_KEYS.forEach((key) => {
            sessionStorage.removeItem(key);
        });
    } catch (error) {
        logger.warn("Failed to clear interleaved state from sessionStorage", { error });
    }
}
