'use client';

import * as React from 'react';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, formatTime, formatDate } from '@/lib/utils';
import type { QuizMode } from '@/types/quiz';

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
      label: 'Excellent',
      color: 'text-green-700 dark:text-green-200',
      bgColor: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800/70',
      icon: <Trophy className="h-12 w-12 text-green-500" aria-hidden="true" />,
    };
  }
  if (score >= 80) {
    return {
      label: 'Great',
      color: 'text-blue-700 dark:text-blue-200',
      bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800/70',
      icon: <Award className="h-12 w-12 text-blue-500" aria-hidden="true" />,
    };
  }
  if (score >= 70) {
    return {
      label: 'Good',
      color: 'text-cyan-700 dark:text-cyan-200',
      bgColor: 'bg-cyan-50 border-cyan-200 dark:bg-cyan-900/30 dark:border-cyan-800/70',
      icon: <CheckCircle className="h-12 w-12 text-cyan-500" aria-hidden="true" />,
    };
  }
  if (score >= 60) {
    return {
      label: 'Passing',
      color: 'text-amber-700 dark:text-amber-200',
      bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800/70',
      icon: <Target className="h-12 w-12 text-amber-500" aria-hidden="true" />,
    };
  }
  return {
    label: 'Needs Work',
    color: 'text-red-700 dark:text-red-200',
    bgColor: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800/70',
    icon: <AlertTriangle className="h-12 w-12 text-red-500" aria-hidden="true" />,
  };
}

/**
 * Get trend indicator compared to previous score.
 */
function getTrendIndicator(current: number, previous: number | null | undefined): TrendIndicator | null {
  if (previous === null || previous === undefined) return null;

  const diff = current - previous;

  if (diff > 0) {
    return {
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
      text: `+${diff}% from last attempt`,
      color: 'text-green-600',
    };
  }
  if (diff < 0) {
    return {
      icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
      text: `${diff}% from last attempt`,
      color: 'text-red-600',
    };
  }
  return {
    icon: <Minus className="h-4 w-4" aria-hidden="true" />,
    text: 'Same as last attempt',
    color: 'text-slate-600',
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
    <Card className={cn('overflow-hidden', tier.bgColor, className)}>
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{tier.icon}</div>

          <div className="mb-2">
            <span className={cn('text-6xl font-bold sm:text-7xl', tier.color)}>{score}</span>
            <span className={cn('text-4xl font-bold', tier.color)}>%</span>
          </div>

          <Badge variant={score >= 70 ? 'success' : score >= 60 ? 'warning' : 'danger'} className="mb-4 text-sm">
            {tier.label}
          </Badge>

          <p className="mb-2 text-lg text-slate-700 dark:text-slate-200">
            <span className="font-semibold text-green-600 dark:text-green-200">{correctCount}</span>
            {' correct, '}
            <span className="font-semibold text-red-600 dark:text-red-200">{incorrectCount}</span>
            {' incorrect out of '}
            <span className="font-semibold text-slate-900 dark:text-slate-50">{totalCount}</span>
            {' questions'}
          </p>

          <div className="mb-6 w-full max-w-md" role="presentation">
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${(correctCount / totalCount) * 100}%` }}
                aria-label={`${correctCount} correct`}
              />
              <div
                className="bg-red-400 transition-all duration-500"
                style={{ width: `${(incorrectCount / totalCount) * 100}%` }}
                aria-label={`${incorrectCount} incorrect`}
              />
            </div>
          </div>

          {trend && (
            <div className={cn('mb-6 flex items-center gap-1', trend.color)}>
              {trend.icon}
              <span className="text-sm">{trend.text}</span>
            </div>
          )}

          <div className="grid w-full max-w-md grid-cols-3 gap-4">
            <div className="rounded-lg bg-white/50 p-3 dark:border dark:border-slate-800 dark:bg-slate-900/70">
              <Clock className="mx-auto mb-1 h-5 w-5 text-slate-500 dark:text-slate-200" aria-hidden="true" />
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatTime(timeTakenSeconds)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Duration</p>
            </div>

            <div className="rounded-lg bg-white/50 p-3 dark:border dark:border-slate-800 dark:bg-slate-900/70">
              <Target className="mx-auto mb-1 h-5 w-5 text-slate-500 dark:text-slate-200" aria-hidden="true" />
              <p className="text-lg font-semibold capitalize text-slate-900 dark:text-slate-50">{mode}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Mode</p>
            </div>

            <div className="rounded-lg bg-white/50 p-3 dark:border dark:border-slate-800 dark:bg-slate-900/70">
              <Calendar className="mx-auto mb-1 h-5 w-5 text-slate-500 dark:text-slate-200" aria-hidden="true" />
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatDate(timestamp)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Date</p>
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
        'flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors',
        'hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/80',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <div
        className={cn('flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full', tier.bgColor)}
        aria-label={`Score ${score}%`}
      >
        <span className={cn('text-xl font-bold', tier.color)}>{score}%</span>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'zen' ? 'default' : 'secondary'} className="text-xs">
            {mode === 'zen' ? 'Study' : 'Exam'}
          </Badge>
          <span className="text-sm text-slate-500 dark:text-slate-300">{formatDate(timestamp)}</span>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">Completed in {formatTime(timeTakenSeconds)}</p>
      </div>

      <Badge variant={score >= 70 ? 'success' : score >= 60 ? 'warning' : 'danger'}>{tier.label}</Badge>
    </button>
  );
}

export default Scorecard;
