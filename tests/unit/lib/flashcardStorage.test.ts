import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    saveFlashcardSession,
    getFlashcardSession,
    getFlashcardQuizId,
    clearFlashcardSession,
    FLASHCARD_SESSION_KEY,
    FLASHCARD_QUIZ_ID_KEY,
} from "@/lib/flashcardStorage";

describe("flashcardStorage", () => {
    // Use a mock sessionStorage
    let mockStorage: Record<string, string>;

    beforeEach(() => {
        mockStorage = {};
        vi.stubGlobal("window", {
            sessionStorage: {
                getItem: (key: string): string | null => mockStorage[key] ?? null,
                setItem: (key: string, value: string): void => {
                    mockStorage[key] = value;
                },
                removeItem: (key: string): void => {
                    delete mockStorage[key];
                },
            },
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("saveFlashcardSession", () => {
        it("saves question IDs to sessionStorage", () => {
            const ids = ["q1", "q2", "q3"];
            const result = saveFlashcardSession(ids);

            expect(result).toBe(true);
            expect(mockStorage[FLASHCARD_SESSION_KEY]).toBe(JSON.stringify(ids));
        });

        it("saves quiz ID when provided", () => {
            const ids = ["q1"];
            saveFlashcardSession(ids, "quiz-123");

            expect(mockStorage[FLASHCARD_QUIZ_ID_KEY]).toBe("quiz-123");
        });

        it("does not save quiz ID when not provided", () => {
            saveFlashcardSession(["q1"]);

            expect(mockStorage[FLASHCARD_QUIZ_ID_KEY]).toBeUndefined();
        });

        it("returns false when sessionStorage throws", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    setItem: (): never => {
                        throw new Error("QuotaExceeded");
                    },
                },
            });

            const result = saveFlashcardSession(["q1"]);
            expect(result).toBe(false);
        });
    });

    describe("getFlashcardSession", () => {
        it("returns stored question IDs", () => {
            const ids = ["q1", "q2"];
            mockStorage[FLASHCARD_SESSION_KEY] = JSON.stringify(ids);

            const result = getFlashcardSession();
            expect(result).toEqual(ids);
        });

        it("returns null when no session exists", () => {
            const result = getFlashcardSession();
            expect(result).toBeNull();
        });

        it("returns null for invalid JSON", () => {
            mockStorage[FLASHCARD_SESSION_KEY] = "not-json{";

            const result = getFlashcardSession();
            expect(result).toBeNull();
        });

        it("returns null when stored value is not an array", () => {
            mockStorage[FLASHCARD_SESSION_KEY] = JSON.stringify({ notAnArray: true });

            const result = getFlashcardSession();
            expect(result).toBeNull();
        });
    });

    describe("getFlashcardQuizId", () => {
        it("returns stored quiz ID", () => {
            mockStorage[FLASHCARD_QUIZ_ID_KEY] = "quiz-456";

            const result = getFlashcardQuizId();
            expect(result).toBe("quiz-456");
        });

        it("returns null when no quiz ID exists", () => {
            const result = getFlashcardQuizId();
            expect(result).toBeNull();
        });
    });

    describe("clearFlashcardSession", () => {
        it("removes both session keys", () => {
            mockStorage[FLASHCARD_SESSION_KEY] = JSON.stringify(["q1"]);
            mockStorage[FLASHCARD_QUIZ_ID_KEY] = "quiz-789";

            clearFlashcardSession();

            expect(mockStorage[FLASHCARD_SESSION_KEY]).toBeUndefined();
            expect(mockStorage[FLASHCARD_QUIZ_ID_KEY]).toBeUndefined();
        });

        it("does not throw when storage throws", () => {
            vi.stubGlobal("window", {
                sessionStorage: {
                    removeItem: (): never => {
                        throw new Error("Storage error");
                    },
                },
            });

            // Should not throw
            expect(() => clearFlashcardSession()).not.toThrow();
        });
    });

    describe("SSR safety", () => {
        it("saveFlashcardSession returns false when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            expect(saveFlashcardSession(["q1"])).toBe(false);
        });

        it("getFlashcardSession returns null when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            expect(getFlashcardSession()).toBeNull();
        });

        it("getFlashcardQuizId returns null when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            expect(getFlashcardQuizId()).toBeNull();
        });

        it("clearFlashcardSession does not throw when window is undefined", () => {
            vi.stubGlobal("window", undefined);
            expect(() => clearFlashcardSession()).not.toThrow();
        });
    });
});
