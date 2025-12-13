"use client";

import * as React from "react";
import { Brain, Box, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { LeitnerBox } from "@/types/srs";

interface DueQuestionsCardProps {
    /** Count of questions due by Leitner box. */
    dueCountsByBox: Record<LeitnerBox, number>;
    /** Total questions due for review. */
    totalDue: number;
    /** Optional class name for styling. */
    className?: string;
    /** Optional callback to start review (if not provided, links to /study-due). */
    onStartReview?: () => void;
}

/**
 * Box labels with descriptions for Leitner system.
 */
const BOX_INFO: Record<LeitnerBox, { label: string; color: string }> = {
    1: { label: "New/Struggling", color: "bg-destructive" },
    2: { label: "Learning", color: "bg-warning" },
    3: { label: "Familiar", color: "bg-info" },
    4: { label: "Confident", color: "bg-success/70" },
    5: { label: "Mastered", color: "bg-success" },
};

/**
 * Visual bar showing distribution of due questions by box.
 */
function BoxDistributionBar({
    dueCountsByBox,
    totalDue,
}: {
    dueCountsByBox: Record<LeitnerBox, number>;
    totalDue: number;
}): React.ReactElement {
    if (totalDue === 0) {
        return <div className="h-3 w-full rounded-full bg-muted" />;
    }

    return (
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {([1, 2, 3, 4, 5] as const).map((box) => {
                const count = dueCountsByBox[box];
                if (count === 0) return null;
                const widthPercent = (count / totalDue) * 100;
                return (
                    <div
                        key={box}
                        className={cn("transition-all", BOX_INFO[box].color)}
                        style={{ width: `${widthPercent}%` }}
                        title={`${BOX_INFO[box].label}: ${count}`}
                    />
                );
            })}
        </div>
    );
}

/**
 * Legend item for box distribution.
 */
function BoxLegendItem({
    box,
    count,
}: {
    box: LeitnerBox;
    count: number;
}): React.ReactElement {
    const info = BOX_INFO[box];
    return (
        <div className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-sm", info.color)} />
            <span className="text-sm text-muted-foreground">{info.label}</span>
            <span className="text-sm font-medium">{count}</span>
        </div>
    );
}

/**
 * Card displaying SRS due questions summary with box distribution.
 */
export function DueQuestionsCard({
    dueCountsByBox,
    totalDue,
    className,
    onStartReview,
}: DueQuestionsCardProps): React.ReactElement {
    const hasQuestionsDue = totalDue > 0;

    if (!hasQuestionsDue) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
                        Spaced Repetition
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center">
                        <Box className="mx-auto h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                        <p className="mt-2 text-muted-foreground">
                            No questions due for review! 🎉
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Complete quizzes to build your review queue.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
                    Spaced Repetition
                </CardTitle>
                <CardDescription>
                    Review questions to reinforce your memory
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Total Due */}
                <div className="text-center">
                    <p className="text-4xl font-bold text-primary">{totalDue}</p>
                    <p className="text-sm text-muted-foreground">
                        question{totalDue !== 1 ? "s" : ""} due for review
                    </p>
                </div>

                {/* Box Distribution Bar */}
                <BoxDistributionBar dueCountsByBox={dueCountsByBox} totalDue={totalDue} />

                {/* Legend */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {([1, 2, 3, 4, 5] as const).map((box) => (
                        <BoxLegendItem key={box} box={box} count={dueCountsByBox[box]} />
                    ))}
                </div>

                {/* Action Button */}
                {onStartReview ? (
                    <Button
                        className="w-full"
                        rightIcon={<ArrowRight />}
                        onClick={onStartReview}
                    >
                        Start Review
                    </Button>
                ) : (
                    <Link href="/study-due" className="block">
                        <Button className="w-full" rightIcon={<ArrowRight />}>
                            Start Review
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}

export default DueQuestionsCard;
