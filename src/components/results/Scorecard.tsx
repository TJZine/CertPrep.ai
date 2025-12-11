"use client";

import * as React from "react";
import {
  Trophy,
  Target,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn, formatTime, formatDate } from "@/lib/utils";
import type { QuizMode } from "@/types/quiz";

interface ScorecardProps {
  score: number; // 0-100
  correctCount: number;
  totalCount: number;
  timeTakenSeconds: number;
  mode: QuizMode;
  timestamp: number;
  previousScore?: number | null; // For comparison
  className?: string;
}

interface TrendIndicator {
  icon: React.ReactNode;
  text: string;
  color: string;
}

interface PerformanceTier {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

/**
 * Get performance tier based on score.
 */
function getPerformanceTier(score: number): PerformanceTier {
  if (score >= 90) {
    return {
      label: "Excellent",
      color: "text-tier-excellent",
      bgColor: "bg-tier-excellent/10 border-tier-excellent/30",
      icon: <Trophy className="h-12 w-12 text-tier-excellent" aria-hidden="true" />,
    };
  }
  if (score >= 80) {
    return {
      label: "Great",
      color: "text-tier-great",
      bgColor: "bg-tier-great/10 border-tier-great/30",
      icon: <Award className="h-12 w-12 text-tier-great" aria-hidden="true" />,
    };
  }
  if (score >= 70) {
    return {
      label: "Good",
      color: "text-tier-good",
      bgColor: "bg-tier-good/10 border-tier-good/30",
      icon: (
        <CheckCircle className="h-12 w-12 text-tier-good" aria-hidden="true" />
      ),
    };
  }
  if (score >= 60) {
    return {
      label: "Passing",
      color: "text-tier-passing",
      bgColor: "bg-tier-passing/10 border-tier-passing/30",
      icon: <Target className="h-12 w-12 text-tier-passing" aria-hidden="true" />,
    };
  }
  return {
    label: "Needs Work",
    color: "text-tier-failing",
    bgColor: "bg-tier-failing/10 border-tier-failing/30",
    icon: (
      <AlertTriangle className="h-12 w-12 text-tier-failing" aria-hidden="true" />
    ),
  };
}

/**
 * Get trend indicator compared to previous score.
 */
function getTrendIndicator(
  current: number,
  previous: number | null | undefined,
): TrendIndicator | null {
  if (previous === null || previous === undefined) return null;

  const diff = current - previous;

  if (diff > 0) {
    return {
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
      text: `+${diff}% from last attempt`,
      color: "text-success",
    };
  }
  if (diff < 0) {
    return {
      icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
      text: `${diff}% from last attempt`,
      color: "text-destructive",
    };
  }
  return {
    icon: <Minus className="h-4 w-4" aria-hidden="true" />,
    text: "Same as last attempt",
    color: "text-muted-foreground",
  };
}

/**
 * Prominent scorecard for quiz results.
 */
export function Scorecard({
  score,
  correctCount,
  totalCount,
  timeTakenSeconds,
  mode,
  timestamp,
  previousScore,
  className,
}: ScorecardProps): React.ReactElement {
  const tier = getPerformanceTier(score);
  const trend = getTrendIndicator(score, previousScore);
  const incorrectCount = totalCount - correctCount;

  return (
    <Card className={cn("overflow-hidden", tier.bgColor, className)}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{tier.icon}</div>

          <div className="mb-2">
            <span className={cn("text-6xl font-bold sm:text-7xl", tier.color)}>
              {score}
            </span>
            <span className={cn("text-4xl font-bold", tier.color)}>%</span>
          </div>

          <Badge
            variant={
              score >= 70 ? "success" : score >= 60 ? "warning" : "danger"
            }
            className="mb-4 text-sm"
          >
            {tier.label}
          </Badge>

          <p className="mb-2 text-lg text-muted-foreground">
            <span className="font-semibold text-success">
              {correctCount}
            </span>
            {" correct, "}
            <span className="font-semibold text-destructive">
              {incorrectCount}
            </span>
            {" incorrect out of "}
            <span className="font-semibold text-foreground">
              {totalCount}
            </span>
            {" questions"}
          </p>

          <div className="mb-6 w-full max-w-md" role="presentation">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("bg-success transition-all duration-500")}
                style={{
                  width: totalCount
                    ? `${Math.round((correctCount / totalCount) * 100)}%`
                    : "0%",
                }}
                aria-label={`${correctCount} correct`}
              />
              <div
                className={cn("bg-destructive/70 transition-all duration-500")}
                style={{
                  width: totalCount
                    ? `${Math.round((incorrectCount / totalCount) * 100)}%`
                    : "0%",
                }}
                aria-label={`${incorrectCount} incorrect`}
              />
            </div>
          </div>

          {trend && (
            <div className={cn("mb-6 flex items-center gap-1", trend.color)}>
              {trend.icon}
              <span className="text-sm">{trend.text}</span>
            </div>
          )}

          <div className="grid w-full max-w-md grid-cols-3 gap-4">
            <div className="rounded-lg bg-background/50 p-3 border border-border">
              <Clock
                className="mx-auto mb-1 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-lg font-semibold text-foreground">
                {formatTime(timeTakenSeconds)}
              </p>
              <p className="text-xs text-muted-foreground">
                Duration
              </p>
            </div>

            <div className="rounded-lg bg-background/50 p-3 border border-border">
              <Target
                className="mx-auto mb-1 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-lg font-semibold capitalize text-foreground">
                {mode}
              </p>
              <p className="text-xs text-muted-foreground">Mode</p>
            </div>

            <div className="rounded-lg bg-background/50 p-3 border border-border">
              <Calendar
                className="mx-auto mb-1 h-5 w-5 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-lg font-semibold text-foreground">
                {formatDate(timestamp)}
              </p>
              <p className="text-xs text-muted-foreground">Date</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ScorecardCompactProps {
  score: number;
  mode: QuizMode;
  timestamp: number;
  timeTakenSeconds: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact scorecard for list views.
 */
export function ScorecardCompact({
  score,
  mode,
  timestamp,
  timeTakenSeconds,
  onClick,
  className,
}: ScorecardCompactProps): React.ReactElement {
  const tier = getPerformanceTier(score);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border border-border p-4 text-left transition-colors",
        "hover:bg-accent bg-card",
        onClick ? "cursor-pointer" : "cursor-default",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full",
          tier.bgColor,
        )}
        aria-label={`Score ${score}%`}
      >
        <span className={cn("text-xl font-bold", tier.color)}>{score}%</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge
            variant={mode === "zen" ? "default" : "secondary"}
            className="text-xs"
          >
            {mode === "zen" ? "Study" : "Exam"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {formatDate(timestamp)}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground">
          Completed in {formatTime(timeTakenSeconds)}
        </p>
      </div>

      <Badge
        variant={score >= 70 ? "success" : score >= 60 ? "warning" : "danger"}
      >
        {tier.label}
      </Badge>
    </button>
  );
}

export default Scorecard;
