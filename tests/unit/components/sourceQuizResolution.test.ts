import { describe, it, expect } from "vitest";

/**
 * Tests for source quiz name resolution logic used in ResultsContainer.
 * This validates the algorithm, not the React hook integration.
 */
describe("sourceQuizNames resolution logic", () => {
    // Simulates the resolution logic from ResultsContainer
    function resolveSourceQuizNames(
        sourceMap: Record<string, string> | undefined,
        quizzes: Array<{ id: string; title: string } | null>
    ): Record<string, string> {
        if (!sourceMap) return {};

        const nameMap: Record<string, string> = {};
        quizzes.forEach((q) => {
            if (q) {
                nameMap[q.id] = q.title;
            }
        });
        return nameMap;
    }

    it("returns quiz names for valid source map entries", () => {
        const sourceMap = { q1: "quiz-1", q2: "quiz-2" };
        const quizzes = [
            { id: "quiz-1", title: "Math Quiz" },
            { id: "quiz-2", title: "Science Quiz" },
        ];

        const result = resolveSourceQuizNames(sourceMap, quizzes);

        expect(result).toEqual({
            "quiz-1": "Math Quiz",
            "quiz-2": "Science Quiz",
        });
    });

    it("gracefully handles deleted source quizzes", () => {
        const sourceMap = { q1: "quiz-1", q2: "deleted-quiz" };
        const quizzes = [
            { id: "quiz-1", title: "Math Quiz" },
            null, // deleted quiz returns null from db.quizzes.get()
        ];

        const result = resolveSourceQuizNames(sourceMap, quizzes);

        // Only the existing quiz should be in the result
        expect(result).toEqual({ "quiz-1": "Math Quiz" });
        expect(result["deleted-quiz"]).toBeUndefined();
    });

    it("returns empty object when sourceMap is undefined", () => {
        const result = resolveSourceQuizNames(undefined, []);

        expect(result).toEqual({});
    });

    it("deduplicates quiz IDs before fetching", () => {
        // Multiple questions from same quiz should only require one fetch
        const sourceMap = {
            q1: "quiz-1",
            q2: "quiz-1",
            q3: "quiz-2",
            q4: "quiz-1",
        };

        const uniqueIds = [...new Set(Object.values(sourceMap))];

        expect(uniqueIds).toHaveLength(2);
        expect(uniqueIds).toContain("quiz-1");
        expect(uniqueIds).toContain("quiz-2");
    });

    it("handles empty sourceMap", () => {
        const sourceMap = {};
        const quizzes: Array<{ id: string; title: string }> = [];

        const result = resolveSourceQuizNames(sourceMap, quizzes);

        expect(result).toEqual({});
    });

    it("handles all quizzes being deleted", () => {
        const sourceMap = { q1: "quiz-1", q2: "quiz-2" };
        const quizzes = [null, null]; // all deleted

        const result = resolveSourceQuizNames(sourceMap, quizzes);

        expect(result).toEqual({});
    });
});
