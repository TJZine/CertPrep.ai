"use client";

import { db } from "@/db";
import { remixQuiz } from "@/lib/quiz-remix";
import { logger } from "@/lib/logger";
import type { Quiz, Question } from "@/types/quiz";

/**
 * Configuration for generating an interleaved practice session.
 */
export interface InterleavedConfig {
    /** Optional: specific quiz IDs to pull questions from */
    quizIds?: string[];
    /** Optional: filter questions by category */
    categories?: string[];
    /** Optional: filter quizzes by tags */
    tags?: string[];
    /** Maximum number of questions to include */
    questionCount: number;
    /** Whether to shuffle answers using remix */
    enableRemix: boolean;
}

/**
 * Result of generating an interleaved practice session.
 */
export interface InterleavedResult {
    /** Virtual quiz containing aggregated questions */
    quiz: Quiz;
    /** Key mappings for answer translation (if remix enabled) */
    keyMappings: Map<string, Record<string, string>> | null;
    /** Maps questionId → sourceQuizId for attribution */
    sourceMap: Map<string, string>;
}

/**
 * Error thrown when no questions match the filter criteria.
 */
export class NoQuestionsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoQuestionsError";
    }
}

/**
 * Fisher-Yates shuffle for random sampling.
 */
function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j] as T;
        result[j] = temp as T;
    }
    return result;
}

/**
 * Samples questions with category balancing.
 * Attempts to include equal representation from each category.
 */
function sampleWithCategoryBalance(
    questions: Array<{ question: Question; quizId: string }>,
    count: number,
): Array<{ question: Question; quizId: string }> {
    if (questions.length <= count) {
        return shuffle(questions);
    }

    // Group by category
    const byCategory = new Map<string, Array<{ question: Question; quizId: string }>>();
    for (const item of questions) {
        const cat = item.question.category || "Uncategorized";
        if (!byCategory.has(cat)) {
            byCategory.set(cat, []);
        }
        byCategory.get(cat)!.push(item);
    }

    // Shuffle within each category
    for (const [cat, items] of byCategory) {
        byCategory.set(cat, shuffle(items));
    }

    // Round-robin selection
    const result: Array<{ question: Question; quizId: string }> = [];
    const categories = [...byCategory.keys()];
    let categoryIndex = 0;

    while (result.length < count) {
        const cat = categories[categoryIndex % categories.length];
        const items = byCategory.get(cat!);
        if (items && items.length > 0) {
            result.push(items.shift()!);
        } else {
            // Remove exhausted category
            categories.splice(categoryIndex % categories.length, 1);
            if (categories.length === 0) break;
        }
        categoryIndex++;
    }

    return result;
}

/**
 * Generates an interleaved practice session by aggregating questions
 * from multiple quizzes based on filter criteria.
 *
 * @param config - Configuration specifying filters and options
 * @param userId - The user's ID for quiz access
 * @returns InterleavedResult with aggregated quiz and metadata
 * @throws NoQuestionsError if no questions match criteria
 */
export async function generateInterleavedSession(
    config: InterleavedConfig,
    userId: string,
): Promise<InterleavedResult> {
    // 1. Fetch all user quizzes (excluding deleted)
    let quizzes = await db.quizzes
        .where("user_id")
        .equals(userId)
        .filter((q) => !q.deleted_at)
        .toArray();

    // 2. Filter by quizIds if provided
    if (config.quizIds && config.quizIds.length > 0) {
        const idSet = new Set(config.quizIds);
        quizzes = quizzes.filter((q) => idSet.has(q.id));
    }

    // 3. Filter by tags if provided
    if (config.tags && config.tags.length > 0) {
        const tagSet = new Set(config.tags.map((t) => t.toLowerCase()));
        quizzes = quizzes.filter((q) =>
            q.tags.some((t) => tagSet.has(t.toLowerCase())),
        );
    }

    // 4. Flatten questions with source tracking
    const pool: Array<{ question: Question; quizId: string }> = [];
    for (const quiz of quizzes) {
        for (const question of quiz.questions) {
            pool.push({ question, quizId: quiz.id });
        }
    }

    // 5. Filter by categories if provided
    let filteredPool = pool;
    if (config.categories && config.categories.length > 0) {
        const catSet = new Set(config.categories.map((c) => c.toLowerCase()));
        filteredPool = pool.filter((item) => {
            const cat = (item.question.category || "Uncategorized").toLowerCase();
            return catSet.has(cat);
        });
    }

    // 6. Check for empty pool
    if (filteredPool.length === 0) {
        const hasFilters =
            (config.quizIds && config.quizIds.length > 0) ||
            (config.tags && config.tags.length > 0) ||
            (config.categories && config.categories.length > 0);

        throw new NoQuestionsError(
            hasFilters
                ? "No questions match your filter criteria. Try adjusting your filters."
                : "No questions available. Import or create quizzes first.",
        );
    }

    // 7. Sample with category balancing
    const sampled = sampleWithCategoryBalance(filteredPool, config.questionCount);

    // Log if fewer questions than requested
    if (sampled.length < config.questionCount) {
        logger.info("Interleaved session has fewer questions than requested", {
            requested: config.questionCount,
            available: sampled.length,
            poolSize: filteredPool.length,
        });
    }

    // 8. Build source map
    const sourceMap = new Map<string, string>();
    for (const item of sampled) {
        sourceMap.set(item.question.id, item.quizId);
    }

    // 9. Build virtual quiz
    const timestamp = Date.now();
    const virtualQuiz: Quiz = {
        id: `interleaved-${timestamp}`,
        user_id: userId,
        title: "Interleaved Practice",
        description: `Practice session generated on ${new Date(timestamp).toLocaleDateString()}`,
        created_at: timestamp,
        updated_at: timestamp,
        questions: sampled.map((item) => item.question),
        tags: ["interleaved"],
        version: 1,
    };

    // 10. Apply remix if enabled
    if (config.enableRemix) {
        try {
            const { quiz: remixedQuiz, keyMappings } = await remixQuiz(virtualQuiz);
            return {
                quiz: remixedQuiz,
                keyMappings,
                sourceMap,
            };
        } catch (error) {
            logger.error("Failed to remix interleaved quiz, proceeding without remix", { error });
            return {
                quiz: virtualQuiz,
                keyMappings: null,
                sourceMap,
            };
        }
    }

    return {
        quiz: virtualQuiz,
        keyMappings: null,
        sourceMap,
    };
}

/**
 * Gets available categories from user's quizzes for filter UI.
 */
export async function getAvailableCategories(userId: string): Promise<string[]> {
    const quizzes = await db.quizzes
        .where("user_id")
        .equals(userId)
        .filter((q) => !q.deleted_at)
        .toArray();

    const categories = new Set<string>();
    for (const quiz of quizzes) {
        for (const question of quiz.questions) {
            categories.add(question.category || "Uncategorized");
        }
    }

    return [...categories].sort();
}

/**
 * Gets available tags from user's quizzes for filter UI.
 */
export async function getAvailableTags(userId: string): Promise<string[]> {
    const quizzes = await db.quizzes
        .where("user_id")
        .equals(userId)
        .filter((q) => !q.deleted_at)
        .toArray();

    const tags = new Set<string>();
    for (const quiz of quizzes) {
        for (const tag of quiz.tags) {
            tags.add(tag);
        }
    }

    return [...tags].sort();
}

/**
 * Gets total question count matching filters (for UI preview).
 */
export async function getMatchingQuestionCount(
    userId: string,
    config: Omit<InterleavedConfig, "questionCount" | "enableRemix">,
): Promise<number> {
    let quizzes = await db.quizzes
        .where("user_id")
        .equals(userId)
        .filter((q) => !q.deleted_at)
        .toArray();

    if (config.quizIds && config.quizIds.length > 0) {
        const idSet = new Set(config.quizIds);
        quizzes = quizzes.filter((q) => idSet.has(q.id));
    }

    if (config.tags && config.tags.length > 0) {
        const tagSet = new Set(config.tags.map((t) => t.toLowerCase()));
        quizzes = quizzes.filter((q) =>
            q.tags.some((t) => tagSet.has(t.toLowerCase())),
        );
    }

    let count = 0;
    for (const quiz of quizzes) {
        if (config.categories && config.categories.length > 0) {
            const catSet = new Set(config.categories.map((c) => c.toLowerCase()));
            count += quiz.questions.filter((q) => {
                const cat = (q.category || "Uncategorized").toLowerCase();
                return catSet.has(cat);
            }).length;
        } else {
            count += quiz.questions.length;
        }
    }

    return count;
}
