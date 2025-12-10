"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  type TooltipProps,
} from "recharts";
import { BookOpen, Clock, Target, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { cn, formatTime } from "@/lib/utils";
import { useChartColors } from "@/hooks/useChartColors";
import { useChartDimensions } from "@/hooks/useChartDimensions";
import type { OverallStats } from "@/db/results";

type TooltipEntry = { name?: string; value?: number; payload?: unknown };

type TooltipContentProps = TooltipProps<number, string> & {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: string | number;
};

const PieTooltip = ({
  active,
  payload,
}: TooltipContentProps): React.ReactElement | null => {
  const data = payload?.[0];
  if (!active || !data) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="font-medium text-popover-foreground">
        {data.name}
      </p>
      <p className="text-sm text-muted-foreground">
        {data.value} attempts
      </p>
    </div>
  );
};

const BarTooltip = ({
  active,
  payload,
  label,
}: TooltipContentProps): React.ReactElement | null => {
  const data = payload?.[0];
  if (!active || !data) return null;
  const minutes = typeof data.value === "number" ? data.value : 0;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
      <p className="font-medium text-popover-foreground">{label}</p>
      <p className="text-sm text-muted-foreground">
        Study Time: {formatTime(minutes * 60)}
      </p>
    </div>
  );
};

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
            <CardContent className="flex items-center gap-4 p-4">
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

interface ScoreDistributionProps {
  results: Array<{ score: number }>;
  className?: string;
}

/**
 * Pie chart showing distribution of scores.
 */
export function ScoreDistribution({
  results,
  className,
}: ScoreDistributionProps): React.ReactElement {
  const { colors } = useChartColors();
  const { containerRef, isReady } = useChartDimensions();
  const validResults = React.useMemo(
    () =>
      results.filter(
        (r) =>
          typeof r.score === "number" && r.score >= 0 && r.score <= 100,
      ),
    [results],
  );

  const distribution = React.useMemo(() => {
    const ranges = [
      {
        name: "90-100%",
        min: 90,
        max: 100,
        colorKey: "tierExcellent" as const,
        colorClass: "legend-dot-excellent",
      },
      {
        name: "80-89%",
        min: 80,
        max: 89,
        colorKey: "tierGreat" as const,
        colorClass: "legend-dot-great",
      },
      {
        name: "70-79%",
        min: 70,
        max: 79,
        colorKey: "tierGood" as const,
        colorClass: "legend-dot-good",
      },
      {
        name: "60-69%",
        min: 60,
        max: 69,
        colorKey: "tierPassing" as const,
        colorClass: "legend-dot-passing",
      },
      {
        name: "Below 60%",
        min: 0,
        max: 59,
        colorKey: "tierFailing" as const,
        colorClass: "legend-dot-failing",
      },
    ];

    return ranges
      .map((range) => ({
        name: range.name,
        value: validResults.filter(
          (r) => r.score >= range.min && r.score <= range.max,
        ).length,
        colorKey: range.colorKey,
        colorClass: range.colorClass,
      }))
      .filter((r) => r.value > 0);
  }, [validResults]);

  if (validResults.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Complete some quizzes to see your score distribution
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score Distribution</CardTitle>
        <CardDescription>Performance breakdown by score range</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[250px]">
          {isReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {distribution.map((entry) => (
                    <Cell key={entry.name} fill={colors[entry.colorKey]} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {distribution.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", entry.colorClass)} />
              <span className="text-sm text-muted-foreground">
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface StudyTimeChartProps {
  dailyData: Array<{ date: string; minutes: number }>;
  className?: string;
}

/**
 * Bar chart of study time per day.
 */
export function StudyTimeChart({
  dailyData,
  className,
}: StudyTimeChartProps): React.ReactElement {
  const { colors } = useChartColors();
  const { containerRef, isReady } = useChartDimensions();

  if (dailyData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Study Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No study data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Study Activity</CardTitle>
        <CardDescription>
          Minutes studied per day (last 14 days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-[250px]">
          {isReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: colors.muted, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="minutes" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsOverview;
