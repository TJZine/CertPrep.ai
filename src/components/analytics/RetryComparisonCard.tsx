"use client";

import * as React from "react";
import { RotateCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface RetryComparisonCardProps {
    firstAttemptAvg: number | null;
    retryAvg: number | null;
    avgImprovement: number | null;
    className?: string;
}

/**
 * Stat bar showing a value with visual indicator.
 */
function StatBar({
    label,
    value,
    maxValue = 100,
    color,
    bgColor,
}: {
    label: string;
    value: number;
    maxValue?: number;
    color: string;
    bgColor: string;
}): React.ReactElement {
    const percentage = Math.min(100, (value / maxValue) * 100);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                    {label}
                </span>
                <span className={cn("text-lg font-bold", color)}>{value}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn("h-full transition-all duration-500", bgColor)}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Card comparing first attempt vs retry performance.
 */
export function RetryComparisonCard({
    firstAttemptAvg,
    retryAvg,
    avgImprovement,
    className,
}: RetryComparisonCardProps): React.ReactElement {
    const hasData = firstAttemptAvg !== null && retryAvg !== null;

    if (!hasData) {
        return (
            <Card className={className}>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-info" aria-hidden="true" />
                        Retry Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Retake some quizzes to see how you improve on repeated attempts.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const getImprovementBadge = (): React.ReactElement | null => {
        if (avgImprovement === null) return null;

        if (avgImprovement > 0) {
            return (
                <Badge variant="success" className="gap-1">
                    <TrendingUp className="h-3 w-3" aria-hidden="true" />
                    +{avgImprovement}% improvement
                </Badge>
            );
        } else if (avgImprovement < 0) {
            return (
                <Badge variant="danger" className="gap-1">
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    {avgImprovement}% decline
                </Badge>
            );
        } else {
            return (
                <Badge variant="secondary" className="gap-1">
                    <Minus className="h-3 w-3" aria-hidden="true" />
                    No change
                </Badge>
            );
        }
    };

    return (
        <Card className={className}>
            <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-info" aria-hidden="true" />
                            Retry Performance
                        </CardTitle>
                        <CardDescription>
                            How you improve on repeated quiz attempts
                        </CardDescription>
                    </div>
                    {getImprovementBadge()}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-4">
                    <StatBar
                        label="First Attempt Average"
                        value={firstAttemptAvg}
                        color="text-muted-foreground"
                        bgColor="bg-muted-foreground"
                    />

                    <StatBar
                        label="Retry Average"
                        value={retryAvg}
                        color={
                            retryAvg >= firstAttemptAvg
                                ? "text-correct"
                                : "text-warning"
                        }
                        bgColor={
                            retryAvg >= firstAttemptAvg
                                ? "bg-correct"
                                : "bg-warning"
                        }
                    />
                </div>

                {avgImprovement !== null && avgImprovement > 0 && (
                    <div className="mt-4 rounded-lg bg-correct/10 p-3">
                        <p className="text-sm text-correct">
                            <strong>Great progress!</strong> Retaking quizzes is helping you
                            improve your scores by an average of {avgImprovement}%.
                        </p>
                    </div>
                )}

                {avgImprovement !== null && avgImprovement <= 0 && (
                    <div className="mt-4 rounded-lg bg-info/10 p-3">
                        <p className="text-sm text-info">
                            <strong>Tip:</strong> Review your missed questions before retaking
                            a quiz to maximize improvement.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default RetryComparisonCard;
