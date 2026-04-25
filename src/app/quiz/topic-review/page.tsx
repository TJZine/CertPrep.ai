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
import { hydrateAggregatedQuiz } from "@/db/aggregatedQuiz";
import {
    clearTopicStudyState,
    TOPIC_STUDY_QUESTIONS_KEY,
    TOPIC_STUDY_CATEGORY_KEY,
    TOPIC_STUDY_MISSED_COUNT_KEY,
    TOPIC_STUDY_FLAGGED_COUNT_KEY,
} from "@/lib/storage/topicStudyStorage";
import { logger } from "@/lib/logger";
import type { Quiz } from "@/types/quiz";

/**
 * Dedicated Topic Study page that aggregates questions from multiple quizzes.
 *
 * Unlike the regular zen page which requires a single quiz ID, this page:
 * 1. Reads question IDs from sessionStorage (set by WeakAreasCard)
 * 2. Loads questions from ALL quizzes that contain them
 * 3. Creates a synthetic "aggregated" quiz object
 * 4. Passes to ZenQuizContainer for the topic study session
 */
export default function TopicReviewPage(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);
    const { isInitialized, error: dbError } = useInitializeDatabase();

    const [isLoading, setIsLoading] = React.useState(true);
    const [aggregatedQuiz, setAggregatedQuiz] = React.useState<Quiz | null>(null);
    const [sourceMap, setSourceMap] = React.useState<Map<string, string> | null>(null);
    const [questionCount, setQuestionCount] = React.useState(0);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [category, setCategory] = React.useState<string | null>(null);
    const [missedCount, setMissedCount] = React.useState(0);
    const [flaggedCount, setFlaggedCount] = React.useState(0);

    // Load questions from sessionStorage and aggregate across quizzes
    React.useEffect(() => {
        if (!isInitialized || !effectiveUserId) return;

        let isMounted = true;

        const loadQuestions = async (): Promise<void> => {
            try {
                // SSR guard
                if (typeof window === "undefined") return;

                const storedQuestionIds = sessionStorage.getItem(TOPIC_STUDY_QUESTIONS_KEY);
                const storedCategory = sessionStorage.getItem(TOPIC_STUDY_CATEGORY_KEY);
                const storedMissedCount = sessionStorage.getItem(TOPIC_STUDY_MISSED_COUNT_KEY);
                const storedFlaggedCount = sessionStorage.getItem(TOPIC_STUDY_FLAGGED_COUNT_KEY);

                if (!storedQuestionIds) {
                    if (isMounted) {
                        setLoadError("No topic study session found. Please start from the Analytics page.");
                        setIsLoading(false);
                    }
                    return;
                }

                let questionIds: string[];
                try {
                    questionIds = JSON.parse(storedQuestionIds);
                } catch (parseError) {
                    logger.warn("Invalid topic study session data in sessionStorage", { parseError });
                    clearTopicStudyState();
                    if (isMounted) {
                        setLoadError("Invalid study session data. Please start a new session from Analytics.");
                        setIsLoading(false);
                    }
                    return;
                }

                if (questionIds.length === 0) {
                    if (isMounted) {
                        setLoadError("No questions in study session.");
                        setIsLoading(false);
                    }
                    return;
                }

                // Parse counts (safe to set even if unmounting)
                if (isMounted) {
                    if (storedMissedCount) {
                        const parsed = Number.parseInt(storedMissedCount, 10);
                        if (!Number.isNaN(parsed)) setMissedCount(parsed);
                    }
                    if (storedFlaggedCount) {
                        const parsed = Number.parseInt(storedFlaggedCount, 10);
                        if (!Number.isNaN(parsed)) setFlaggedCount(parsed);
                    }
                    if (storedCategory) {
                        setCategory(storedCategory);
                    }
                }

                const hydrated = await hydrateAggregatedQuiz(
                    questionIds,
                    effectiveUserId,
                    storedCategory ? `Topic Study: ${storedCategory}` : "Topic Study",
                );

                if (!isMounted) return;

                if (hydrated.syntheticQuiz.questions.length === 0) {
                    if (isMounted) {
                        setLoadError("Could not find any of the requested questions. They may have been deleted.");
                        setIsLoading(false);
                    }
                    return;
                }

                if (isMounted) {
                    setAggregatedQuiz(hydrated.syntheticQuiz);
                    setSourceMap(new Map(Object.entries(hydrated.sourceMap)));
                    setQuestionCount(hydrated.syntheticQuiz.questions.length);
                    setIsLoading(false);
                }
            } catch (err) {
                logger.error("Failed to load topic study questions", { error: err });
                if (isMounted) {
                    setLoadError("Failed to load study session. Please try again.");
                    setIsLoading(false);
                }
            }
        };

        void loadQuestions();

        return (): void => {
            isMounted = false;
        };
    }, [isInitialized, effectiveUserId]);

    const handleExit = React.useCallback((): void => {
        clearTopicStudyState();
        router.push("/analytics");
    }, [router]);

    // Loading states
    if (!isInitialized || !effectiveUserId || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <LoadingSpinner size="lg" text="Preparing Topic Study..." />
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
                        onClick={() => router.push("/analytics")}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Analytics
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
                        Study Session Not Found
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {loadError || "Could not load the study session."}
                    </p>
                    <Button
                        className="mt-6"
                        onClick={() => router.push("/analytics")}
                        leftIcon={<ArrowLeft className="h-4 w-4" />}
                    >
                        Back to Analytics
                    </Button>
                </div>
            </div>
        );
    }

    const bannerTitle = category ? `Topic Study: ${category}` : "Topic Study";

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
                            An error occurred during the study session. Please try again.
                        </p>
                        <Button
                            className="mt-6"
                            onClick={() => router.push("/analytics")}
                            leftIcon={<ArrowLeft className="h-4 w-4" />}
                        >
                            Back to Analytics
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="bg-background px-4 pt-4">
                <div className="mx-auto max-w-3xl">
                    <SessionBanner
                        totalQuestions={questionCount}
                        missedCount={missedCount}
                        flaggedCount={flaggedCount}
                        onExit={handleExit}
                        title={bannerTitle}
                    />
                </div>
            </div>

            <ZenQuizContainer
                quiz={aggregatedQuiz}
                isSmartRound={false}
                isTopicStudy
                sessionSourceMap={sourceMap}
            />
        </ErrorBoundary>
    );
}
