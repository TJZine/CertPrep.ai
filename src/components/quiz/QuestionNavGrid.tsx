'use client';

import * as React from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

type QuestionStatus = 'unseen' | 'seen' | 'answered' | 'flagged';

interface QuestionNavItem {
  id: string;
  index: number;
  status: QuestionStatus;
}

interface QuestionNavGridProps {
  questions: QuestionNavItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
}

/**
 * Grid of question numbers for Proctor mode sidebar.
 */
export function QuestionNavGrid({
  questions,
  currentIndex,
  onNavigate,
  className,
}: QuestionNavGridProps): React.ReactElement {
  const statusStyles: Record<QuestionStatus, string> = {
    unseen: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    seen: 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    answered: 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400',
    flagged: 'bg-orange-400 text-white hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-400',
  };

  const statusLabels: Record<QuestionStatus, string> = {
    unseen: 'Not viewed',
    seen: 'Viewed, not answered',
    answered: 'Answered',
    flagged: 'Flagged for review',
  };

  const stats = React.useMemo(() => {
    const counts = {
      unseen: 0,
      seen: 0,
      answered: 0,
      flagged: 0,
    };
    questions.forEach((q) => {
      counts[q.status] += 1;
    });
    return counts;
  }, [questions]);

  return (
    <div className={cn('flex flex-col', className)}>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Question Navigator</h3>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-500" aria-hidden="true" />
          <span>{stats.answered} answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-orange-400" aria-hidden="true" />
          <span>{stats.flagged} flagged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          <span>{stats.seen} viewed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" aria-hidden="true" />
          <span>{stats.unseen} unseen</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 p-1" role="navigation" aria-label="Question navigation">
        {questions.map((question) => {
          const isCurrent = question.index === currentIndex;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onNavigate(question.index)}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-sm font-medium transition-all',
                statusStyles[question.status],
                isCurrent && 'border-2 border-slate-900 shadow-sm dark:border-slate-100',
              )}
              aria-label={`Question ${question.index + 1}: ${statusLabels[question.status]}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {question.index + 1}
              {question.status === 'flagged' ? (
                <Flag className="absolute -right-1 -top-1 h-3 w-3 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-300">Legend</p>
        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-800" />
            <span>Unseen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
            <span>Viewed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-blue-500" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-orange-400" />
            <span>Flagged</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-300">Shortcuts</p>
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-200">
          <div className="flex justify-between">
            <span>Next question</span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">→</kbd>
          </div>
          <div className="flex justify-between">
            <span>Previous question</span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">←</kbd>
          </div>
          <div className="flex justify-between">
            <span>Flag question</span>
            <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">F</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuestionNavStripProps {
  questions: QuestionNavItem[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  className?: string;
}

/**
 * Mobile-friendly horizontal navigator.
 */
export function QuestionNavStrip({
  questions,
  currentIndex,
  onNavigate,
  className,
}: QuestionNavStripProps): React.ReactElement {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const currentButton = containerRef.current.querySelector<HTMLElement>(`[data-index="${currentIndex}"]`);
      currentButton?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentIndex]);

  const statusStyles: Record<QuestionStatus, string> = {
    unseen: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
    seen: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100',
    answered: 'bg-blue-500 text-white hover:bg-blue-600 dark:hover:bg-blue-400',
    flagged: 'bg-orange-400 text-white hover:bg-orange-500 dark:hover:bg-orange-400',
  };

  return (
    <div
      ref={containerRef}
      className={cn('flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin', className)}
      role="navigation"
      aria-label="Question navigation"
    >
      {questions.map((question) => {
        const isCurrent = question.index === currentIndex;
        return (
          <button
            key={question.id}
            type="button"
            data-index={question.index}
            onClick={() => onNavigate(question.index)}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-transparent text-xs font-medium transition-all',
              statusStyles[question.status],
              isCurrent && 'border-2 border-slate-900 shadow-sm dark:border-slate-100',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {question.index + 1}
          </button>
        );
      })}
    </div>
  );
}

export default QuestionNavGrid;
