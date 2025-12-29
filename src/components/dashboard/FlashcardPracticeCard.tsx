"use client";

import * as React from "react";
import { Layers, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface FlashcardPracticeCardProps {
    /** Number of flashcards due for review. */
    dueCount?: number;
    /** Optional class name for styling. */
    className?: string;
}

/**
 * Dashboard card promoting Flashcard study mode.
 * Shows due count and provides quick access to flashcard review.
 */
export function FlashcardPracticeCard({
    dueCount = 0,
    className,
}: FlashcardPracticeCardProps): React.ReactElement {
    const hasDue = dueCount > 0;

    return (
        <Card className={cn("border-primary/20", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
                        Flashcard Review
                    </CardTitle>
                    {hasDue && (
                        <Badge variant="default" className="text-xs">
                            {dueCount} due
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    {hasDue
                        ? `Review ${dueCount} flashcard${dueCount === 1 ? "" : "s"} due for spaced repetition`
                        : "Study with flip cards for active recall"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Link
                    href="/flashcards/review"
                    className={cn(
                        buttonVariants({ variant: hasDue ? "default" : "outline" }),
                        "w-full"
                    )}
                >
                    {hasDue ? "Start Review" : "Browse Flashcards"}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
            </CardContent>
        </Card>
    );
}

export default FlashcardPracticeCard;
