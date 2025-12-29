"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { FlashcardRating } from "./FlashcardControls";

export interface FlashcardSummaryProps {
    /** Map of question ID to rating */
    ratings: Record<string, FlashcardRating>;
    /** Total number of cards in the session */
    totalCards: number;
    /** Optional class name */
    className?: string;
}

/**
 * End-of-session summary showing rating breakdown.
 * Transient display - not persisted to database.
 */
export function FlashcardSummary({
    ratings,
    totalCards,
    className,
}: FlashcardSummaryProps): React.ReactElement {
    const router = useRouter();

    // Calculate rating counts
    const counts = React.useMemo(() => {
        const result = { again: 0, hard: 0, good: 0 };
        Object.values(ratings).forEach((rating) => {
            if (rating === 1) result.again++;
            else if (rating === 2) result.hard++;
            else if (rating === 3) result.good++;
        });
        return result;
    }, [ratings]);

    const masteryRate = totalCards > 0
        ? Math.round((counts.good / totalCards) * 100)
        : 0;

    return (
        <Card className={cn("w-full max-w-md mx-auto", className)}>
            <CardHeader className="text-center pb-4">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                    <Check className="h-7 w-7 text-correct" aria-hidden="true" />
                    Session Complete
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="flex flex-col items-center p-3 rounded-lg bg-destructive/10">
                        <RotateCcw className="h-5 w-5 text-destructive mb-1" aria-hidden="true" />
                        <span className="text-2xl font-bold text-destructive">{counts.again}</span>
                        <span className="text-xs text-muted-foreground">Again</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg bg-warning/10">
                        <ChevronRight className="h-5 w-5 text-warning mb-1" aria-hidden="true" />
                        <span className="text-2xl font-bold text-warning">{counts.hard}</span>
                        <span className="text-xs text-muted-foreground">Hard</span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg bg-correct/10">
                        <Check className="h-5 w-5 text-correct mb-1" aria-hidden="true" />
                        <span className="text-2xl font-bold text-correct">{counts.good}</span>
                        <span className="text-xs text-muted-foreground">Good</span>
                    </div>
                </div>

                {/* Mastery rate */}
                <div className="text-center py-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-1">Mastery Rate</p>
                    <p className="text-3xl font-bold text-foreground">{masteryRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {totalCards} cards reviewed
                    </p>
                </div>

                {/* Navigation */}
                <Button
                    onClick={() => router.push("/")}
                    className="w-full"
                    leftIcon={<Home className="h-4 w-4" aria-hidden="true" />}
                >
                    Back to Dashboard
                </Button>
            </CardContent>
        </Card>
    );
}

export default FlashcardSummary;
