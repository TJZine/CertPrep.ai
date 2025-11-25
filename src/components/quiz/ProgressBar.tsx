'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  showFraction?: boolean;
  variant?: 'default' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  default: 'bg-blue-600',
  success: 'bg-green-600',
  warning: 'bg-orange-500',
};

/**
 * Linear progress bar with optional text indicators.
 */
export function ProgressBar({
  current,
  total,
  showPercentage = false,
  showFraction = false,
  variant = 'default',
  size = 'md',
  className,
  label = 'Quiz progress',
}: ProgressBarProps): React.ReactElement {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('w-full', className)}>
      {(showPercentage || showFraction) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {showFraction && <span className="text-slate-600">{current} / {total}</span>}
          {showPercentage && <span className="text-slate-600">{percentage}%</span>}
        </div>
      )}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-slate-200', sizeClasses[size])}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-300 ease-out', variantClasses[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface SegmentedProgressProps {
  questions: Array<{
    id: string;
    status: 'unanswered' | 'correct' | 'incorrect' | 'flagged';
  }>;
  currentIndex: number;
  onQuestionClick?: (index: number) => void;
  className?: string;
}

/**
 * Segmented bar showing per-question statuses.
 */
export function SegmentedProgress({
  questions,
  currentIndex,
  onQuestionClick,
  className,
}: SegmentedProgressProps): React.ReactElement {
  const statusColors = {
    unanswered: 'bg-slate-200',
    correct: 'bg-green-500',
    incorrect: 'bg-red-500',
    flagged: 'bg-orange-400',
  };

  return (
    <div className={cn('flex gap-1', className)} role="group" aria-label="Question progress">
      {questions.map((question, index) => (
        <button
          key={question.id}
          onClick={() => onQuestionClick?.(index)}
          className={cn(
            'h-2 flex-1 rounded-full transition-all',
            statusColors[question.status],
            index === currentIndex && 'ring-2 ring-blue-500 ring-offset-1',
            onQuestionClick && 'cursor-pointer hover:opacity-80',
          )}
          aria-label={`Question ${index + 1}: ${question.status}`}
          aria-current={index === currentIndex ? 'step' : undefined}
        />
      ))}
    </div>
  );
}

export default ProgressBar;
