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
}: {
    label: string;
    value: number;
    maxValue?: number;
    color: string;
}): React.ReactElement {
    const percentage = Math.min(100, (value / maxValue) * 100);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </span>
                <span className={cn("text-lg font-bold", color)}>{value}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                    className={cn("h-full transition-all duration-500", color.replace("text-", "bg-"))}
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
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-blue-500" aria-hidden="true" />
                        Retry Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-slate-500 dark:text-slate-400">
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
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-blue-500" aria-hidden="true" />
                            Retry Performance
                        </CardTitle>
                        <CardDescription>
                            How you improve on repeated quiz attempts
                        </CardDescription>
                    </div>
                    {getImprovementBadge()}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <StatBar
                        label="First Attempt Average"
                        value={firstAttemptAvg}
                        color="text-slate-600 dark:text-slate-400"
                    />

                    <StatBar
                        label="Retry Average"
                        value={retryAvg}
                        color={
                            retryAvg >= firstAttemptAvg
                                ? "text-green-600 dark:text-green-400"
                                : "text-amber-600 dark:text-amber-400"
                        }
                    />
                </div>

                {avgImprovement !== null && avgImprovement > 0 && (
                    <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                        <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Great progress!</strong> Retaking quizzes is helping you
                            improve your scores by an average of {avgImprovement}%.
                        </p>
                    </div>
                )}

                {avgImprovement !== null && avgImprovement <= 0 && (
                    <div className="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
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
