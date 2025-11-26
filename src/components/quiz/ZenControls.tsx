'use client';

import * as React from 'react';
import { AlertTriangle, ArrowRight, RotateCcw, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ZenControlsProps {
  onAgain: () => void;
  onHard: () => void;
  onGood: () => void;
  isLastQuestion?: boolean;
  className?: string;
}

/**
 * Spaced repetition controls for Zen study mode.
 */
export function ZenControls({
  onAgain,
  onHard,
  onGood,
  isLastQuestion = false,
  className,
}: ZenControlsProps): React.ReactElement {
  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-center text-sm text-slate-500">How well did you know this?</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          onClick={onAgain}
          className={cn(
            'flex-1 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800',
            'sm:flex-initial sm:min-w-[120px]',
          )}
          aria-label="Again - show this question again soon"
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Again
          <span className="ml-2 hidden text-xs text-red-500 sm:inline">(1)</span>
        </Button>

        <Button
          variant="outline"
          onClick={onHard}
          className={cn(
            'flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-800',
            'sm:flex-initial sm:min-w-[120px]',
          )}
          aria-label="Hard - add to review list"
        >
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
          Hard
          <span className="ml-2 hidden text-xs text-orange-500 sm:inline">(2)</span>
        </Button>

        <Button
          variant="outline"
          onClick={onGood}
          className={cn(
            'flex-1 border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800',
            'sm:flex-initial sm:min-w-[120px]',
          )}
          aria-label={isLastQuestion ? 'Good - finish quiz' : 'Good - continue to next question'}
        >
          {isLastQuestion ? (
            <>
              <ThumbsUp className="mr-2 h-4 w-4" aria-hidden="true" />
              Finish
            </>
          ) : (
            <>
              <ThumbsUp className="mr-2 h-4 w-4" aria-hidden="true" />
              Good
            </>
          )}
          <span className="ml-2 hidden text-xs text-green-500 sm:inline">(3)</span>
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Keyboard shortcuts:{' '}
        <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">1</kbd> Again,{' '}
        <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">2</kbd> Hard,{' '}
        <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">3</kbd> Good
      </p>
    </div>
  );
}

interface NextButtonProps {
  onClick: () => void;
  isLastQuestion?: boolean;
  className?: string;
}

export function NextButton({ onClick, isLastQuestion = false, className }: NextButtonProps): React.ReactElement {
  return (
    <div className={cn('flex justify-center', className)}>
      <Button onClick={onClick} rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
        {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
      </Button>
    </div>
  );
}

interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function SubmitButton({ onClick, disabled = false, className }: SubmitButtonProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <Button onClick={onClick} disabled={disabled} size="lg" className="min-w-[200px]">
        Check Answer
      </Button>
      {!disabled && (
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-300">
          or press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono dark:bg-slate-800 dark:text-slate-100">Enter</kbd>
        </p>
      )}
    </div>
  );
}

export default ZenControls;
