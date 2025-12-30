"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { FlashcardContainer } from "@/components/flashcard";
import { Button } from "@/components/ui/Button";
import { useInitializeDatabase, useQuiz } from "@/hooks/useDatabase";
import { useAuth } from "@/components/providers/AuthProvider";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

/**
 * Flashcard study skeleton for loading state.
 */
function FlashcardSkeleton(): React.ReactElement {
    return (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4 animate-pulse">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="h-8 w-16 rounded bg-muted" />
                <div className="h-6 w-32 rounded bg-muted" />
                <div className="w-16" />
            </div>
            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-4 w-10 rounded bg-muted" />
                </div>
                <div className="h-2 w-full rounded-full bg-muted" />
            </div>
            {/* Card */}
            <div className="h-72 w-full rounded-lg bg-muted" />
            {/* Button */}
            <div className="h-12 w-40 mx-auto rounded-lg bg-muted" />
        </div>
    );
}

/**
 * Flashcard study page for a single quiz.
 * Route: /quiz/[id]/flashcard
 */
export default function FlashcardPage(): React.ReactElement {
    const params = useParams();
    const router = useRouter();
    const quizId = Array.isArray(params.id) ? params.id[0] : params.id;

    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);

    const { isInitialized, error: dbError } = useInitializeDatabase();
    const { quiz, isLoading } = useQuiz(
        isInitialized ? quizId : undefined,
        effectiveUserId ?? undefined
    );

    // Loading state
    if (!isInitialized || !effectiveUserId || isLoading) {
        return <FlashcardSkeleton />;
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

    // Quiz not found
    if (!quiz) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                    <AlertCircle className="mx-auto h-12 w-12 text-warning" />
                    <h1 className="mt-4 text-xl font-semibold text-foreground">
                        Quiz Not Found
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        The quiz you&apos;re looking for doesn&apos;t exist or may have been
                        deleted.
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

    // No questions
    if (quiz.questions.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
                    <AlertCircle className="mx-auto h-12 w-12 text-warning" />
                    <h1 className="mt-4 text-xl font-semibold text-foreground">
                        No Questions
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This quiz doesn&apos;t have any questions to study.
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

    return (
        <main className="min-h-screen bg-background py-6">
            <FlashcardContainer quiz={quiz} />
        </main>
    );
}
