"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FlashcardCard } from "./FlashcardCard";
import { FlashcardControls, type FlashcardRating } from "./FlashcardControls";
import { FlashcardProgress } from "./FlashcardProgress";
import { FlashcardSummary } from "./FlashcardSummary";
import { Button, buttonVariants } from "@/components/ui/Button";
import { updateSRSState } from "@/db/srs";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";
import { useAuth } from "@/components/providers/AuthProvider";
import { clearFlashcardSession } from "@/lib/flashcardStorage";
import { cn } from "@/lib/utils";
import type { Quiz } from "@/types/quiz";

export interface FlashcardContainerProps {
    /** The quiz containing questions to study */
    quiz: Quiz;
    /** Whether this is an aggregated SRS review session */
    isSRSReview?: boolean;
    /** Optional class name */
    className?: string;
}

/**
 * Main orchestrator for flashcard study sessions.
 * Manages card state, SRS updates, and session completion.
 */
export function FlashcardContainer({
    quiz,
    isSRSReview = false,
    className,
}: FlashcardContainerProps): React.ReactElement {
    const { user } = useAuth();
    const effectiveUserId = useEffectiveUserId(user?.id);

    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isFlipped, setIsFlipped] = React.useState(false);
    const [ratings, setRatings] = React.useState<Record<string, FlashcardRating>>({});
    const [isComplete, setIsComplete] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);

    const questions = quiz.questions;
    const currentQuestion = questions[currentIndex];
    const totalCards = questions.length;

    // Handle card flip
    const handleFlip = React.useCallback(() => {
        if (!isFlipped) {
            setIsFlipped(true);
        }
    }, [isFlipped]);

    // Handle rating selection
    const handleRate = React.useCallback(
        async (rating: FlashcardRating): Promise<void> => {
            if (!currentQuestion || !effectiveUserId || isUpdating) return;

            setIsUpdating(true);

            try {
                // Store the rating
                setRatings((prev) => ({
                    ...prev,
                    [currentQuestion.id]: rating,
                }));

                // Update SRS state
                // Rating 1 (Again) = incorrect, Rating 2-3 = correct for SRS purposes
                const wasCorrect = rating >= 2;
                await updateSRSState(currentQuestion.id, effectiveUserId, wasCorrect);

                // Move to next card or complete
                if (currentIndex < totalCards - 1) {
                    setCurrentIndex((prev) => prev + 1);
                    setIsFlipped(false);
                } else {
                    // Session complete
                    clearFlashcardSession();
                    setIsComplete(true);
                }
            } finally {
                setIsUpdating(false);
            }
        },
        [currentQuestion, effectiveUserId, currentIndex, totalCards, isUpdating]
    );

    // Show summary when complete
    if (isComplete) {
        return (
            <div className={cn("flex flex-col items-center justify-center min-h-[60vh] p-4", className)}>
                <FlashcardSummary ratings={ratings} totalCards={totalCards} />
            </div>
        );
    }

    // Safety check for invalid index
    if (!currentQuestion) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <p className="text-lg text-muted-foreground mb-4">No questions available</p>
                <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col gap-6 w-full max-w-2xl mx-auto p-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link
                    href="/"
                    className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "gap-1"
                    )}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Exit
                </Link>
                <h1 className="text-lg font-semibold truncate max-w-[50%]">
                    {isSRSReview ? "Flashcard Review" : quiz.title}
                </h1>
                <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* Progress */}
            <FlashcardProgress currentIndex={currentIndex} totalCards={totalCards} />

            {/* Card */}
            <FlashcardCard
                question={currentQuestion}
                isFlipped={isFlipped}
                onFlip={handleFlip}
            />

            {/* Controls - only show when flipped */}
            {isFlipped && (
                <FlashcardControls onRate={handleRate} disabled={isUpdating} />
            )}

            {/* Flip prompt when not flipped */}
            {!isFlipped && (
                <div className="text-center">
                    <Button onClick={handleFlip} size="lg">
                        Reveal Answer
                    </Button>
                </div>
            )}
        </div>
    );
}

export default FlashcardContainer;
