"use client";

import { hashAnswer } from "@/lib/utils";
import type { Question, Quiz } from "@/types/quiz";

/**
 * Result of remixing a single question.
 * Contains the shuffled question and the key mapping for answer translation.
 */
export interface RemixedQuestionResult {
    /** The question with shuffled options and updated correct_answer/hash */
    question: Question;
    /**
     * Maps remixed option key → original option key.
     * Used to translate user answers back to original keys for storage.
     * Example: { "A": "C", "B": "A", "C": "D", "D": "B" }
     */
    keyMapping: Record<string, string>;
}

/**
 * Result of remixing an entire quiz.
 */
export interface RemixedQuizResult {
    /** The quiz with shuffled questions and shuffled options */
    quiz: Quiz;
    /**
     * Maps question ID → key mapping.
     * Used to translate user answers back to original keys for storage.
     */
    keyMappings: Map<string, Record<string, string>>;
}

/**
 * Fisher-Yates shuffle algorithm.
 * Pure function - does not mutate input array.
 *
 * @param array - Array to shuffle
 * @returns New array with elements in random order
 */
function shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j] as T;
        result[j] = temp as T;
    }
    return result;
}

/** Standard answer key labels (A-H supports up to 8 options) */
const ANSWER_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

/**
 * Shuffles a single question's answer options and updates the correct answer.
 *
 * The original question is not mutated. Returns both the remixed question
 * and a key mapping to translate user answers back to original keys.
 *
 * @param question - The question to remix
 * @returns RemixedQuestionResult with shuffled question and key mapping
 */
export async function remixQuestion(
    question: Question,
): Promise<RemixedQuestionResult> {
    const originalEntries = Object.entries(question.options);

    // Shuffle the option entries (preserves [key, text] pairs, just reorders)
    const shuffledEntries = shuffle(originalEntries);

    // Find the original correct answer text (to identify it after shuffling)
    const originalCorrectKey = question.correct_answer;
    const correctText = originalCorrectKey
        ? question.options[originalCorrectKey]
        : null;

    // Rebuild options with new keys and track the mapping
    const newOptions: Record<string, string> = {};
    const keyMapping: Record<string, string> = {};
    let newCorrectKey: string | undefined;

    const keysToUse = ANSWER_KEYS.slice(0, shuffledEntries.length);

    for (let i = 0; i < shuffledEntries.length; i++) {
        const entry = shuffledEntries[i];
        const newKey = keysToUse[i];
        if (!entry || !newKey) continue;

        const [originalKey, text] = entry;
        newOptions[newKey] = text;
        keyMapping[newKey] = originalKey; // Map: new key → original key

        // Track where the correct answer ended up
        if (text === correctText) {
            newCorrectKey = newKey;
        }
    }

    // Rehash the new correct answer key
    const newHash = newCorrectKey
        ? await hashAnswer(newCorrectKey)
        : question.correct_answer_hash;

    return {
        question: {
            ...question,
            options: newOptions,
            correct_answer: newCorrectKey,
            correct_answer_hash: newHash,
        },
        keyMapping,
    };
}

/**
 * Creates a remixed copy of a quiz with shuffled questions and shuffled answer options.
 *
 * The original quiz is not mutated. Returns both the remixed quiz and key mappings
 * to translate user answers back to original keys for storage (critical for analytics).
 *
 * @param quiz - The quiz to remix
 * @returns RemixedQuizResult with shuffled quiz and key mappings per question
 */
export async function remixQuiz(quiz: Quiz): Promise<RemixedQuizResult> {
    // Shuffle question order
    const shuffledQuestionOrder = shuffle(quiz.questions);

    // Remix each question's options
    const remixResults = await Promise.all(
        shuffledQuestionOrder.map((q) => remixQuestion(q)),
    );

    // Build the key mappings map
    const keyMappings = new Map<string, Record<string, string>>();
    const remixedQuestions: Question[] = [];

    for (const result of remixResults) {
        remixedQuestions.push(result.question);
        keyMappings.set(result.question.id, result.keyMapping);
    }

    return {
        quiz: {
            ...quiz,
            questions: remixedQuestions,
        },
        keyMappings,
    };
}

/**
 * Translates a user's selected answer key back to the original key.
 *
 * Used when storing results to ensure analytics can correctly evaluate
 * the answer against the source quiz's correct_answer_hash.
 *
 * @param remixedKey - The key the user selected (e.g., "A" in remixed view)
 * @param keyMapping - The mapping for this question (remixedKey → originalKey)
 * @returns The original key to store in the result
 */
export function translateToOriginalKey(
    remixedKey: string,
    keyMapping: Record<string, string> | undefined,
): string {
    if (!keyMapping) {
        return remixedKey; // No remix active, return as-is
    }
    return keyMapping[remixedKey] ?? remixedKey;
}

/**
 * Builds a Record of question ID → original answer key from a Map of answers.
 *
 * Translates remixed answer keys back to original keys using the provided mappings.
 * This ensures stored results always reference original question option keys for
 * consistent analytics and scoring.
 *
 * @param answers - Map of question ID → { selectedAnswer: string }
 * @param keyMappings - Optional map of question ID → key mapping (remixed → original)
 * @returns Record suitable for result persistence
 */
export function buildAnswersRecord(
    answers: Map<string, { selectedAnswer: string }>,
    keyMappings: Map<string, Record<string, string>> | null | undefined,
): Record<string, string> {
    const record: Record<string, string> = {};
    answers.forEach((ans, questionId) => {
        const mapping = keyMappings?.get(questionId);
        record[questionId] = translateToOriginalKey(ans.selectedAnswer, mapping);
    });
    return record;
}
