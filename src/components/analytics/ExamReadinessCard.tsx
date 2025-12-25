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
                            ? "text-success"
                            : "text-warning",
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
                            ? "text-success"
                            : "text-warning",
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
                            ? "text-success"
                            : "text-warning",
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
                        isPassing ? "bg-success" : "bg-warning",
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

    const isEmpty = categoryReadiness.size === 0;

    // Always render full Card structure for stable height
    return (
        <Card className={className} data-testid="exam-readiness-card">
            <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            🎯 Exam Readiness
                        </CardTitle>
                        <CardDescription>
                            {isEmpty
                                ? "Track your exam preparation progress"
                                : isPassing
                                    ? "You're on track to pass!"
                                    : `Target: ${passingThreshold}% to pass`}
                        </CardDescription>
                    </div>
                    {!isEmpty && getConfidenceBadge(readinessConfidence)}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="grid gap-8 md:grid-cols-2">
                    <div className="flex items-center justify-center">
                        {isEmpty ? (
                            // Empty state gauge placeholder
                            <div className="flex h-[200px] w-[200px] flex-col items-center justify-center">
                                <div className="text-center">
                                    <div className="text-6xl">🎯</div>
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Complete some quizzes to see your readiness score
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ReadinessGauge score={readinessScore} threshold={passingThreshold} />
                        )}
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">
                            Category Breakdown
                        </h4>
                        {/* Always render 6 rows for stable height */}
                        {Array.from({ length: 6 }).map((_, index) => {
                            const category = categories[index];
                            if (category) {
                                return (
                                    <CategoryBar
                                        key={category[0]}
                                        category={category[0]}
                                        score={category[1]}
                                        threshold={passingThreshold}
                                    />
                                );
                            }
                            // Placeholder for missing categories
                            return (
                                <div key={`placeholder-${index}`} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                                        <div className="h-4 w-8 animate-pulse rounded bg-muted" />
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-secondary" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ExamReadinessCard;
