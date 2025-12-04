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
import { useIsDarkMode } from "@/hooks/useIsDarkMode";
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-900 dark:text-slate-50">
        {data.name}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
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
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium text-slate-900 dark:text-slate-50">{label}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Study Time: {formatTime(minutes)}
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
      color: "text-blue-600 dark:text-blue-200",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Total Attempts",
      value: stats.totalAttempts,
      icon: Target,
      color: "text-green-600 dark:text-green-200",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Average Score",
      value: stats.totalAttempts > 0 ? `${stats.averageScore}%` : "-",
      icon: Award,
      color: "text-amber-600 dark:text-amber-200",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Study Time",
      value: formatTime(stats.totalStudyTime),
      icon: Clock,
      color: "text-purple-600 dark:text-purple-200",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
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
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  {stat.value}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-300">
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
        color: "#22c55e",
        colorClass: "legend-dot-green",
      },
      {
        name: "80-89%",
        min: 80,
        max: 89,
        color: "#3b82f6",
        colorClass: "legend-dot-blue",
      },
      {
        name: "70-79%",
        min: 70,
        max: 79,
        color: "#06b6d4",
        colorClass: "legend-dot-cyan",
      },
      {
        name: "60-69%",
        min: 60,
        max: 69,
        color: "#f59e0b",
        colorClass: "legend-dot-amber",
      },
      {
        name: "Below 60%",
        min: 0,
        max: 59,
        color: "#ef4444",
        colorClass: "legend-dot-red",
      },
    ];

    return ranges
      .map((range) => ({
        name: range.name,
        value: validResults.filter(
          (r) => r.score >= range.min && r.score <= range.max,
        ).length,
        color: range.color,
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
          <p className="text-center text-slate-500 dark:text-slate-300">
            No data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Score Distribution</CardTitle>
        <CardDescription>
          Breakdown of your scores across all attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
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
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {distribution.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <span className={cn("h-3 w-3 rounded-full", entry.colorClass)} />
              <span className="text-sm text-slate-600 dark:text-slate-200">
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
  const isDark = useIsDarkMode();
  const tickColor = isDark ? "#cbd5e1" : "#64748b";
  const gridColor = isDark ? "#1f2937" : "#e2e8f0";

  if (dailyData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Study Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 dark:text-slate-300">
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
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="date"
                tick={{ fill: tickColor, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: tickColor, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default AnalyticsOverview;
