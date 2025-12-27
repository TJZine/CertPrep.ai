"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FlashcardProgressProps {
    /** Current card index (0-based) */
    currentIndex: number;
    /** Total number of cards */
    totalCards: number;
    /** Optional class name */
    className?: string;
}

/**
 * Simple progress indicator showing "Card X of Y" with a visual bar.
 */
export function FlashcardProgress({
    currentIndex,
    totalCards,
    className,
}: FlashcardProgressProps): React.ReactElement {
    const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

    return (
        <div className={cn("w-full", className)}>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>
                    Card <span className="font-semibold text-foreground">{currentIndex + 1}</span> of{" "}
                    <span className="font-semibold text-foreground">{totalCards}</span>
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={currentIndex + 1}
                aria-valuemin={1}
                aria-valuemax={totalCards}
                aria-label={`Progress: card ${currentIndex + 1} of ${totalCards}`}
            >
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

export default FlashcardProgress;
