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

        const quiz: Quiz = JSON.parse(quizJson);
        const sourceMap: Record<string, string> = JSON.parse(sourceMapJson);

        let keyMappings: Record<string, Record<string, string>> | null = null;
        const keyMappingsJson = sessionStorage.getItem(INTERLEAVED_KEY_MAPPINGS_KEY);
        if (keyMappingsJson) {
            keyMappings = JSON.parse(keyMappingsJson);
        }

        return { quiz, sourceMap, keyMappings };
    } catch (error) {
        logger.warn("Failed to load interleaved state from sessionStorage", { error });
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
