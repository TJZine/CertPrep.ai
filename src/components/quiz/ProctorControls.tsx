'use client';

import * as React from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, FlagOff, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ProctorControlsProps {
  currentIndex: number;
  totalQuestions: number;
  isFlagged: boolean;
  hasAnswer: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  onSubmitExam: () => void;
  className?: string;
}

/**
 * Navigation and action controls for Proctor exam mode.
 */
export function ProctorControls({
  currentIndex,
  totalQuestions,
  isFlagged,
  hasAnswer,
  onPrevious,
  onNext,
  onToggleFlag,
  onSubmitExam,
  className,
}: ProctorControlsProps): React.ReactElement {
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex justify-center">
        {hasAnswer ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-100">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Answer recorded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            No answer selected
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
          aria-label="Previous question"
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button
          variant={isFlagged ? 'warning' : 'outline'}
          onClick={onToggleFlag}
          aria-label={isFlagged ? 'Remove flag' : 'Flag for review'}
          aria-pressed={isFlagged}
        >
          {isFlagged ? (
            <>
              <Flag className="mr-2 h-4 w-4 fill-current" />
              Flagged
            </>
          ) : (
            <>
              <FlagOff className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Mark for Review</span>
              <span className="sm:hidden">Flag</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={isLastQuestion}
          rightIcon={<ChevronRight className="h-4 w-4" />}
          aria-label="Next question"
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <Button
          variant="default"
          size="lg"
          onClick={onSubmitExam}
          className="w-full"
          leftIcon={<Send className="h-4 w-4" />}
          aria-label="Submit exam"
        >
          Submit Exam
        </Button>
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-300">You can review and change answers before submitting</p>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-300">
        <span className="hidden sm:inline">
          Use <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">←</kbd>{' '}
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">→</kbd> to navigate,{' '}
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">F</kbd> to flag
        </span>
      </div>
    </div>
  );
}

interface ProctorControlsCompactProps {
  currentIndex: number;
  totalQuestions: number;
  isFlagged: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleFlag: () => void;
  className?: string;
}

/**
 * Compact controls for small screens.
 */
export function ProctorControlsCompact({
  currentIndex,
  totalQuestions,
  isFlagged,
  onPrevious,
  onNext,
  onToggleFlag,
  className,
}: ProctorControlsCompactProps): React.ReactElement {
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <Button variant="ghost" size="icon" onClick={onPrevious} disabled={isFirstQuestion} aria-label="Previous question">
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFlag}
        className={cn(isFlagged && 'text-orange-500')}
        aria-label={isFlagged ? 'Remove flag' : 'Flag for review'}
      >
        {isFlagged ? <Flag className="h-5 w-5 fill-current" /> : <FlagOff className="h-5 w-5" />}
      </Button>

      <Button variant="ghost" size="icon" onClick={onNext} disabled={isLastQuestion} aria-label="Next question">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default ProctorControls;
