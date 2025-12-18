"use client";

import * as React from "react";
import { BookOpen, CheckCircle, BarChart3, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatsBarProps {
  totalQuizzes: number;
  totalAttempts: number;
  averageScore: number | null;
  totalStudyTime: number;
}

function formatStudyTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

interface StatItemProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  className?: string;
}

function StatItem({
  icon,
  value,
  label,
  className,
}: StatItemProps): React.ReactElement {
  return (
    <Card className={cn("border-border", className)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">
            {value}
          </p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Horizontal stats bar summarizing quiz activity.
 */
export function StatsBar({
  totalQuizzes,
  totalAttempts,
  averageScore,
  totalStudyTime,
}: StatsBarProps): React.ReactElement {
  const stats = [
    {
      icon: <BookOpen className="h-6 w-6" aria-hidden="true" />,
      value: totalQuizzes,
      label: "Quizzes",
    },
    {
      icon: <CheckCircle className="h-6 w-6" aria-hidden="true" />,
      value: totalAttempts,
      label: "Attempts",
    },
    {
      icon: <BarChart3 className="h-6 w-6" aria-hidden="true" />,
      value: averageScore !== null ? `${averageScore}%` : "-",
      label: "Avg Score",
    },
    {
      icon: <Clock className="h-6 w-6" aria-hidden="true" />,
      value: formatStudyTime(totalStudyTime),
      label: "Study Time",
    },
  ];

  return (
    <div className="grid min-h-[100px] grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatItem
          key={stat.label}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
        />
      ))}
    </div>
  );
}

export default StatsBar;
