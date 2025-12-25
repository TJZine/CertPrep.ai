"use client";

import * as React from "react";
import { BookOpen, Clock, Target, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn, formatTime } from "@/lib/utils";
import type { OverallStats } from "@/db/results";

interface AnalyticsOverviewProps {
  stats: OverallStats;
  className?: string;
}

/**
 * Overview stat cards for analytics.
 */
export function AnalyticsOverview({
  stats,
  className,
}: AnalyticsOverviewProps): React.ReactElement {
  const statCards = [
    {
      label: "Total Quizzes",
      value: stats.totalQuizzes,
      icon: BookOpen,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      label: "Total Attempts",
      value: stats.totalAttempts,
      icon: Target,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Average Score",
      value: stats.totalAttempts > 0 ? `${stats.averageScore}%` : "-",
      icon: Award,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      label: "Study Time",
      value: formatTime(stats.totalStudyTime),
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ] as const;

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4 pt-4">
              <div className={cn("rounded-full p-3", stat.bgColor)}>
                <stat.icon
                  className={cn("h-6 w-6", stat.color)}
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsOverview;

