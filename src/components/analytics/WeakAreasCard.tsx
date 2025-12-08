"use client";

import * as React from "react";
import { AlertTriangle, TrendingUp, TrendingDown, BookOpen, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface WeakArea {
  category: string;
  avgScore: number;
  totalQuestions: number;
  recentTrend?: "improving" | "declining" | "stable";
}

interface WeakAreasCardProps {
  weakAreas: WeakArea[];
  onStudyArea?: (category: string) => void;
  className?: string;
}

/**
 * Highlights weakest categories with quick study CTA.
 */
export function WeakAreasCard({
  weakAreas,
  onStudyArea,
  className,
}: WeakAreasCardProps): React.ReactElement {
  const getScoreColor = (score: number): string => {
    if (score >= 70)
      return "text-success bg-success/10";
    if (score >= 50)
      return "text-warning bg-warning/10";
    return "text-destructive bg-destructive/10";
  };

  const getProgressColor = (score: number): string => {
    if (score >= 70) return "bg-success";
    if (score >= 50) return "bg-warning";
    return "bg-destructive";
  };

  if (weakAreas.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className="h-5 w-5 text-warning"
              aria-hidden="true"
            />
            Areas to Improve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-success/50 bg-success/10 p-4 text-center">
            <p className="font-medium text-success">
              🎉 Great job! No weak areas identified.
            </p>
            <p className="mt-1 text-sm text-success/80">
              Keep practicing to maintain your knowledge.
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
          <AlertTriangle
            className="h-5 w-5 text-warning"
            aria-hidden="true"
          />
          Areas to Improve
        </CardTitle>
        <CardDescription>
          Categories where you scored below average
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weakAreas.map((area) => (
            <div
              key={area.category}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {area.category}
                    </h4>
                    {area.recentTrend === "improving" && (
                      <Badge variant="success" className="gap-1">
                        <TrendingUp className="h-3 w-3" aria-hidden="true" />
                        Improving
                      </Badge>
                    )}
                    {area.recentTrend === "declining" && (
                      <Badge variant="danger" className="gap-1">
                        <TrendingDown className="h-3 w-3" aria-hidden="true" />
                        Declining
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {area.totalQuestions} questions attempted
                  </p>
                </div>

                <div
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-semibold",
                    getScoreColor(area.avgScore),
                  )}
                >
                  {area.avgScore}%
                </div>
              </div>

              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      getProgressColor(area.avgScore),
                    )}
                    style={{ width: `${Math.round(area.avgScore)}%` }}
                  />
                </div>
              </div>

              {onStudyArea && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => onStudyArea(area.category)}
                  rightIcon={
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  }
                >
                  <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                  Study This Topic
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-lg bg-info/10 p-3">
          <p className="text-sm text-info">
            <strong>Tip:</strong> Focus on your weakest areas first. Studies
            show that targeted practice improves retention by up to 50%.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeakAreasCard;
