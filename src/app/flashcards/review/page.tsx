"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Layers } from "lucide-react";
import { FlashcardContainer } from "@/components/flashcard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { useInitializeDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { db } from "@/db/index";
import { getDueQuestions } from "@/db/srs";
import {
    clearFlashcardSession,
    getFlashcardSession,
} from "@/lib/flashcardStorage";
import { logger } from "@/lib/logger";
import type { Quiz, Question } from "@/types/quiz";

/**
 * Aggregated flashcard review page for due SRS questions across all quizzes.
 * Route: /flashcards/review
 *
 * Can be accessed either:
 * 1. From FlashcardPracticeCard with pre-populated session
 * 2. Directly, which will load all due questions
 */
export default function FlashcardReviewPage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);
    const { isInitialized, error: dbError } = useInitializeDatabase();

    const [isLoading, setIsLoading] = React.useState(true);
    const [aggregatedQuiz, setAggregatedQuiz] = React.useState<Quiz | null>(null);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    // Request ID for canceling stale async requests
    const requestId = React.useRef(0);

    // Load questions - either from sessionStorage or directly from due questions
    React.useEffect(() => {
        if (!isInitialized || !effectiveUserId) return;

        const currentRequest = ++requestId.current;
        let isMounted = true;

        const loadQuestions = async (): Promise<void> => {
            try {
                // SSR guard
                if (typeof window === "undefined") return;
                // Stale request guard
                if (currentRequest !== requestId.current) return;

                let questionIds: string[];

                // Check if we have a pre-set session
                const storedSession = getFlashcardSession();
                if (storedSession && storedSession.length > 0) {
                    questionIds = storedSession;
                } else {
                    // Load due questions directly
                    const dueStates = await getDueQuestions(effectiveUserId);
                    if (dueStates.length === 0) {
                        if (isMounted) {
                            setLoadError("No flashcards due for review. Great job, you're all caught up!");
                            setIsLoading(false);
                        }
                        return;
                    }
                    questionIds = dueStates.map((s) => s.question_id);
                }

                // Load all quizzes to find questions
                const allQuizzes = await db.quizzes.toArray();

                // Build a map of question ID -> question
                const questionMap = new Map<string, { question: Question; quiz: Quiz }>();
                for (const quiz of allQuizzes) {
                    for (const question of quiz.questions) {
                        if (questionIds.includes(question.id)) {
                            questionMap.set(question.id, { question, quiz });
                        }
                    }
                }

                // Order questions by the stored/due order
                const orderedQuestions: Question[] = [];
                for (const id of questionIds) {
                    const found = questionMap.get(id);
                    if (found) {
                        orderedQuestions.push(found.question);
                    }
                }

                if (orderedQuestions.length === 0) {
                    if (isMounted) {
                        setLoadError("Could not find the requested questions. They may have been deleted.");
                        setIsLoading(false);
                    }
                    return;
                }

                // Create a synthetic "aggregated" quiz
                const syntheticQuiz: Quiz = {
                    id: "flashcard-review-aggregate",
                    title: "Flashcard Review",
                    description: "Spaced repetition flashcard review session",
                    questions: orderedQuestions,
                    tags: [],
                    created_at: Date.now(),
                    user_id: effectiveUserId,
                    version: 1,
                };

                if (isMounted) {
                    setAggregatedQuiz(syntheticQuiz);
                    setIsLoading(false);
                }
            } catch (err) {
                logger.error("Failed to load flashcard review questions", { error: err });
                if (isMounted) {
                    setLoadError("Failed to load review session. Please try again.");
                    setIsLoading(false);
                }
            }
        };

        void loadQuestions();

        return (): void => {
            isMounted = false;
        };
    }, [isInitialized, effectiveUserId]);

    // Loading states
    if (!isInitialized || !effectiveUserId || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <LoadingSpinner size="lg" text="Preparing Flashcard Review..." />
            </div>
        );
    }

    // Database error
    if (dbError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                    <h1 className="mt-4 text-xl font-semibold text-foreground">
                        Database Error
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {dbError.message}
                    </p>
                    <Button
                        className="mt-6"
                        onClick={() => router.push("/")}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    // Load error or no quiz
    if (loadError || !aggregatedQuiz) {
        const isAllCaughtUp = loadError?.includes("all caught up");
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                    {isAllCaughtUp ? (
                        <Layers className="mx-auto h-12 w-12 text-correct" />
                    ) : (
                        <AlertCircle className="mx-auto h-12 w-12 text-warning" />
                    )}
                    <h1 className="mt-4 text-xl font-semibold text-foreground">
                        {isAllCaughtUp ? "All Caught Up!" : "Review Session Not Found"}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {loadError || "Could not load the review session."}
                    </p>
                    <Button
                        className="mt-6"
                        onClick={() => {
                            clearFlashcardSession();
                            router.push("/");
                        }}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background py-6">
            <FlashcardContainer quiz={aggregatedQuiz} isSRSReview={true} />
        </main>
    );
}
