"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { ZenQuizContainer } from "@/components/quiz/ZenQuizContainer";
import { SessionBanner } from "@/components/quiz/SessionBanner";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { Button } from "@/components/ui/Button";
import { useInitializeDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { db } from "@/db/index";
import { clearSRSReviewState, SRS_REVIEW_QUESTIONS_KEY } from "@/lib/srsReviewStorage";
import { logger } from "@/lib/logger";
import type { Quiz, Question } from "@/types/quiz";

/**
 * Dedicated SRS Review page that aggregates questions from multiple quizzes.
 * 
 * Unlike the regular zen page which requires a single quiz ID, this page:
 * 1. Reads question IDs from sessionStorage
 * 2. Loads questions from ALL quizzes that contain them
 * 3. Creates a synthetic "aggregated" quiz object
 * 4. Passes to ZenQuizContainer for the review session
 */
export default function SRSReviewPage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);
    const { isInitialized, error: dbError } = useInitializeDatabase();

    const [isLoading, setIsLoading] = React.useState(true);
    const [aggregatedQuiz, setAggregatedQuiz] = React.useState<Quiz | null>(null);
    const [questionCount, setQuestionCount] = React.useState(0);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    // Load questions from sessionStorage and aggregate across quizzes
    React.useEffect(() => {
        if (!isInitialized || !effectiveUserId) return;

        const loadQuestions = async (): Promise<void> => {
            try {
                // SSR guard
                if (typeof window === "undefined") return;

                const storedQuestionIds = sessionStorage.getItem(SRS_REVIEW_QUESTIONS_KEY);

                if (!storedQuestionIds) {
                    setLoadError("No review session found. Please start a review from the Study Due page.");
                    setIsLoading(false);
                    return;
                }

                let questionIds: string[];
                try {
                    questionIds = JSON.parse(storedQuestionIds);
                } catch (parseError) {
                    logger.warn("Invalid SRS review session data in sessionStorage", { parseError });
                    sessionStorage.removeItem(SRS_REVIEW_QUESTIONS_KEY);
                    setLoadError("Invalid review session data. Please start a new review from Study Due.");
                    setIsLoading(false);
                    return;
                }

                if (questionIds.length === 0) {
                    setLoadError("No questions in review session.");
                    setIsLoading(false);
                    return;
                }

                // Load all quizzes to find questions
                const allQuizzes = await db.quizzes.toArray();

                // Build a map of question ID -> question + source quiz
                const questionMap = new Map<string, { question: Question; quiz: Quiz }>();
                for (const quiz of allQuizzes) {
                    for (const question of quiz.questions) {
                        if (questionIds.includes(question.id)) {
                            questionMap.set(question.id, { question, quiz });
                        }
                    }
                }

                // Order questions by the stored order
                const orderedQuestions: Question[] = [];
                for (const id of questionIds) {
                    const found = questionMap.get(id);
                    if (found) {
                        orderedQuestions.push(found.question);
                    }
                }

                if (orderedQuestions.length === 0) {
                    setLoadError("Could not find any of the requested questions. They may have been deleted.");
                    setIsLoading(false);
                    return;
                }

                // Create a synthetic "aggregated" quiz
                const syntheticQuiz: Quiz = {
                    id: "srs-review-aggregate",
                    title: "SRS Review",
                    description: "Spaced repetition review session",
                    questions: orderedQuestions,
                    tags: [],
                    created_at: Date.now(),
                    user_id: effectiveUserId,
                    version: 1,
                };

                setAggregatedQuiz(syntheticQuiz);
                setQuestionCount(orderedQuestions.length);
                setIsLoading(false);
            } catch (err) {
                logger.error("Failed to load SRS review questions", { error: err });
                setLoadError("Failed to load review session. Please try again.");
                setIsLoading(false);
            }
        };

        void loadQuestions();
    }, [isInitialized, effectiveUserId]);

    const handleExit = React.useCallback((): void => {
        clearSRSReviewState();
        router.push("/study-due");
    }, [router]);

    // Loading states
    if (!isInitialized || !effectiveUserId || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <LoadingSpinner size="lg" text="Preparing SRS Review..." />
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
                        onClick={() => router.push("/study-due")}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Study Due
                    </Button>
                </div>
            </div>
        );
    }

    // Load error (no session, questions not found, etc.)
    if (loadError || !aggregatedQuiz) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                    <AlertCircle className="mx-auto h-12 w-12 text-warning" />
                    <h1 className="mt-4 text-xl font-semibold text-foreground">
                        Review Session Not Found
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {loadError || "Could not load the review session."}
                    </p>
                    <Button
                        className="mt-6"
                        onClick={() => router.push("/study-due")}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Study Due
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <ErrorBoundary
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background p-4">
                    <div className="max-w-md rounded-lg border border-destructive/50 bg-card p-6 text-center shadow-sm">
                        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                        <h1 className="mt-4 text-xl font-semibold text-foreground">
                            Something Went Wrong
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            An error occurred during the review session. Please try again.
                        </p>
                        <Button
                            className="mt-6"
                            onClick={() => router.push("/study-due")}
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                        >
                            Back to Study Due
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="bg-background px-4 pt-4">
                <div className="mx-auto max-w-3xl">
                    <SessionBanner
                        totalQuestions={questionCount}
                        missedCount={0}
                        flaggedCount={0}
                        onExit={handleExit}
                        title="SRS Review"
                    />
                </div>
            </div>

            <ZenQuizContainer
                quiz={aggregatedQuiz}
                isSmartRound={false}
                isSRSReview={true}
            />
        </ErrorBoundary>
    );
}
