"use client";

import * as React from "react";
import { useMemo } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { ConfidenceLevel } from "@/hooks/useAdvancedAnalytics";

interface ExamReadinessCardProps {
    readinessScore: number;
    readinessConfidence: ConfidenceLevel;
    categoryReadiness: Map<string, number>;
    passingThreshold?: number;
    className?: string;
}

const PASSING_THRESHOLD = 70;

/**
 * Circular gauge component for exam readiness score.
 */
function ReadinessGauge({
    score,
    threshold,
}: {
    score: number;
    threshold: number;
}): React.ReactElement {
    const radius = 80;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const isPassing = score >= threshold;

    return (
        <div className="relative flex items-center justify-center">
            <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                className="-rotate-90"
            >
                {/* Background circle */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-secondary"
                />
                {/* Progress circle */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className={cn(
                        "transition-all duration-700 ease-out",
                        isPassing
                            ? "text-green-500 dark:text-green-400"
                            : "text-amber-500 dark:text-amber-400",
                    )}
                />
                {/* Threshold marker */}
                <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray={`2 ${circumference - 2}`}
                    strokeDashoffset={circumference - (threshold / 100) * circumference}
                    className="text-muted-foreground/30"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span
                    className={cn(
                        "text-4xl font-bold",
                        isPassing
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400",
                    )}
                >
                    {score}%
                </span>
                <span className="text-sm text-muted-foreground">
                    Readiness
                </span>
            </div>
        </div>
    );
}

/**
 * Category progress bar for readiness breakdown.
 */
function CategoryBar({
    category,
    score,
    threshold,
}: {
    category: string;
    score: number;
    threshold: number;
}): React.ReactElement {
    const isPassing = score >= threshold;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium text-foreground">
                    {category}
                </span>
                <span
                    className={cn(
                        "font-semibold",
                        isPassing
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-600 dark:text-amber-400",
                    )}
                >
                    {score}%
                </span>
            </div>
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${category} readiness: ${score}%`}
            >
                <div
                    className={cn(
                        "h-full transition-all duration-500",
                        isPassing ? "bg-green-500" : "bg-amber-500",
                    )}
                    style={{ width: `${Math.min(100, score)}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Hero card showing overall exam readiness with category breakdown.
 */
export function ExamReadinessCard({
    readinessScore,
    readinessConfidence,
    categoryReadiness,
    passingThreshold = PASSING_THRESHOLD,
    className,
}: ExamReadinessCardProps): React.ReactElement {
    const categories = useMemo(
        () =>
            Array.from(categoryReadiness.entries())
                .sort((a, b) => a[1] - b[1]) // Sort by score ascending (weakest first)
                .slice(0, 6), // Show top 6 categories
        [categoryReadiness],
    );

    const isPassing = readinessScore >= passingThreshold;

    const getConfidenceBadge = (confidence: ConfidenceLevel): React.ReactElement => {
        switch (confidence) {
            case "high":
                return (
                    <Badge variant="success" className="gap-1">
                        High Confidence
                    </Badge>
                );
            case "medium":
                return (
                    <Badge variant="secondary" className="gap-1">
                        Medium Confidence
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1">
                        Low Confidence
                    </Badge>
                );
        }
    };

    if (categoryReadiness.size === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        🎯 Exam Readiness
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Complete some quizzes to see your exam readiness score.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            🎯 Exam Readiness
                        </CardTitle>
                        <CardDescription>
                            {isPassing
                                ? "You're on track to pass!"
                                : `Target: ${passingThreshold}% to pass`}
                        </CardDescription>
                    </div>
                    {getConfidenceBadge(readinessConfidence)}
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="flex items-center justify-center">
                        <ReadinessGauge score={readinessScore} threshold={passingThreshold} />
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">
                            Category Breakdown
                        </h4>
                        {categories.map(([category, score]) => (
                            <CategoryBar
                                key={category}
                                category={category}
                                score={score}
                                threshold={passingThreshold}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ExamReadinessCard;
