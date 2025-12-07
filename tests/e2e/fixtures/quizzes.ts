import type { Quiz } from "../../../src/types/quiz";
import { TEST_QUIZ } from "./index";

/**
 * Proctor Mode Test Quiz
 * A quiz specifically designed for testing timed exam functionality.
 */
export const PROCTOR_QUIZ: Omit<Quiz, "user_id"> = {
    ...TEST_QUIZ,
    id: "proctor-test-quiz-001",
    title: "Proctor Mode Exam",
    description: "A timed exam for verification",
    tags: ["e2e", "proctor", "timed"],
    questions: [
        ...TEST_QUIZ.questions,
        {
            id: "q3",
            category: "Testing",
            difficulty: "Medium",
            question: "What is the capital of France?",
            options: {
                A: "London",
                B: "Berlin",
                C: "Paris",
                D: "Madrid",
            },
            correct_answer: "C",
            explanation: "Paris is the capital of France.",
        },
        {
            id: "q4",
            category: "Testing",
            difficulty: "Hard",
            question: "Which planet is known as the Red Planet?",
            options: {
                A: "Venus",
                B: "Mars",
                C: "Jupiter",
                D: "Saturn",
            },
            correct_answer: "B",
            explanation: "Mars appears red due to iron oxide.",
        },
        {
            id: "q5",
            category: "Testing",
            difficulty: "Medium",
            question: "What is the largest mammal?",
            options: {
                A: "African Elephant",
                B: "Blue Whale",
                C: "Giraffe",
                D: "Hippopotamus",
            },
            correct_answer: "B",
            explanation: "The Blue Whale is the largest animal known to have ever lived.",
        },
    ],
};
