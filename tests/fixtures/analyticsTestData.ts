import type { Result } from "@/types/result";
import type { Quiz, Question } from "@/types/quiz";

// --- Helper Functions ---

/**
 * Creates a timestamp for N days ago from now.
 */
export function daysAgo(n: number): number {
    const d = new Date();
    d.setHours(12, 0, 0, 0); // Normalize to noon to avoid edge cases
    d.setDate(d.getDate() - n);
    return d.getTime();
}

/**
 * Factory to create a minimal valid Result for testing.
 */
export function createMockResult(overrides: Partial<Result> = {}): Result {
    return {
        id: `result-${Math.random().toString(36).substring(7)}`,
        quiz_id: "quiz-1",
        user_id: "user-1",
        timestamp: Date.now(),
        mode: "zen",
        score: 80,
        time_taken_seconds: 120,
        answers: { q1: "A" },
        flagged_questions: [],
        category_breakdown: { General: 80 },
        ...overrides,
    };
}

/**
 * Factory to create a minimal valid Question for testing.
 */
export function createMockQuestion(overrides: Partial<Question> = {}): Question {
    return {
        id: `q-${Math.random().toString(36).substring(7)}`,
        category: "General",
        question: "Sample Question?",
        options: { A: "Yes", B: "No" },
        correct_answer: "A",
        explanation: "A is correct.",
        ...overrides,
    };
}

/**
 * Factory to create a minimal valid Quiz for testing.
 */
export function createMockQuiz(overrides: Partial<Quiz> = {}): Quiz {
    return {
        id: "quiz-1",
        user_id: "user-1",
        title: "Mock Quiz",
        description: "A test quiz",
        created_at: daysAgo(30),
        updated_at: daysAgo(30),
        questions: [createMockQuestion()],
        tags: [],
        version: 1,
        deleted_at: null,
        quiz_hash: null,
        ...overrides,
    };
}

// --- Pre-built Mock Data Sets ---

export const mockQuizzes: Quiz[] = [
    createMockQuiz({
        id: "quiz-1",
        title: "AWS Networking",
        questions: [
            createMockQuestion({ id: "q1", category: "Networking" }),
            createMockQuestion({ id: "q2", category: "Security" }),
        ],
    }),
    createMockQuiz({
        id: "quiz-2",
        title: "AWS Compute",
        questions: [
            createMockQuestion({ id: "q3", category: "Compute" }),
            createMockQuestion({ id: "q4", category: "Networking" }),
        ],
    }),
];

export const mockResultsForStreaks: Result[] = [
    // 3-day streak: today, yesterday, 2 days ago
    createMockResult({ id: "r1", timestamp: daysAgo(0), score: 85 }),
    createMockResult({ id: "r2", timestamp: daysAgo(1), score: 80 }),
    createMockResult({ id: "r3", timestamp: daysAgo(2), score: 75 }),
    // Gap, then more activity
    createMockResult({ id: "r4", timestamp: daysAgo(5), score: 70 }),
    createMockResult({ id: "r5", timestamp: daysAgo(6), score: 65 }),
];

export const mockResultsForTrends: Result[] = [
    // Category: Networking - Improving
    // Last 3 (most recent)
    createMockResult({
        id: "trend-1",
        timestamp: daysAgo(0),
        category_breakdown: { Networking: 90 },
    }),
    createMockResult({
        id: "trend-2",
        timestamp: daysAgo(1),
        category_breakdown: { Networking: 85 },
    }),
    createMockResult({
        id: "trend-3",
        timestamp: daysAgo(2),
        category_breakdown: { Networking: 80 },
    }),
    // Prior 3
    createMockResult({
        id: "trend-4",
        timestamp: daysAgo(10),
        category_breakdown: { Networking: 65 },
    }),
    createMockResult({
        id: "trend-5",
        timestamp: daysAgo(11),
        category_breakdown: { Networking: 60 },
    }),
    createMockResult({
        id: "trend-6",
        timestamp: daysAgo(12),
        category_breakdown: { Networking: 55 },
    }),
];

export const mockResultsForRetry: Result[] = [
    // Quiz 1: First attempt, then retry with improvement
    createMockResult({
        id: "retry-1",
        quiz_id: "quiz-1",
        timestamp: daysAgo(5),
        score: 60,
    }),
    createMockResult({
        id: "retry-2",
        quiz_id: "quiz-1",
        timestamp: daysAgo(2),
        score: 80,
    }),
    // Quiz 2: Single attempt (no retry)
    createMockResult({
        id: "retry-3",
        quiz_id: "quiz-2",
        timestamp: daysAgo(3),
        score: 70,
    }),
];
