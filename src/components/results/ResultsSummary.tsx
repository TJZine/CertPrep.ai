'use client';

import * as React from 'react';
import { Clock, Target, CheckCircle, XCircle, Flag, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn, formatTime } from '@/lib/utils';
import type { QuizMode } from '@/types/quiz';

interface ResultsSummaryProps {
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  flaggedCount: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  mode: QuizMode;
  averageTimePerQuestion: number;
  className?: string;
}

/**
 * Summary grid of key result stats.
 */
export function ResultsSummary(props: ResultsSummaryProps): React.ReactElement {
  const {
    correctCount,
    incorrectCount,
    unansweredCount,
    flaggedCount,
    timeTakenSeconds,
    mode,
    averageTimePerQuestion,
    className,
  } = props;
  const stats = [
    {
      label: 'Correct',
      value: correctCount,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-200',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Incorrect',
      value: incorrectCount,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-200',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Unanswered',
      value: unansweredCount,
      icon: Target,
      color: 'text-amber-600 dark:text-amber-200',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Flagged',
      value: flaggedCount,
      icon: Flag,
      color: 'text-orange-600 dark:text-orange-200',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    },
  ] as const;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
          Results Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-lg border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={cn('rounded-full p-2', stat.bgColor)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} aria-hidden="true" />
              </div>
              <span className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{stat.value}</span>
              <span className="text-sm text-slate-500 dark:text-slate-300">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
              <Clock className="h-5 w-5 text-slate-600 dark:text-slate-200" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatTime(timeTakenSeconds)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Total Time</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-slate-100 p-2 dark:bg-slate-800">
              <Target className="h-5 w-5 text-slate-600 dark:text-slate-200" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatTime(Math.round(averageTimePerQuestion))}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Avg per Question</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center">
          <Badge variant={mode === 'zen' ? 'default' : 'secondary'} className="text-sm">
            {mode === 'zen' ? '🧘 Zen Study Mode' : '📋 Proctor Exam Mode'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default ResultsSummary;
