'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';

interface OptionsListProps {
  options: Record<string, string>;
  selectedAnswer: string | null;
  correctAnswer: string;
  hasSubmitted: boolean;
  onSelectOption: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

type OptionStatus = 'default' | 'selected' | 'correct' | 'incorrect' | 'missed';

/**
 * Renders answer options with immediate feedback styling.
 */
export function OptionsList({
  options,
  selectedAnswer,
  correctAnswer,
  hasSubmitted,
  onSelectOption,
  disabled = false,
  className,
}: OptionsListProps): React.ReactElement {
  const sortedOptions = React.useMemo(
    () => Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
    [options],
  );

  const getOptionStatus = (key: string): OptionStatus => {
    if (!hasSubmitted) {
      return key === selectedAnswer ? 'selected' : 'default';
    }
    if (key === correctAnswer) return 'correct';
    if (key === selectedAnswer && key !== correctAnswer) return 'incorrect';
    return 'default';
  };

  const statusStyles: Record<OptionStatus, string> = {
    default: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
    selected: 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1',
    correct: 'border-green-500 bg-green-50',
    incorrect: 'border-red-500 bg-red-50',
    missed: 'border-slate-200 bg-slate-50',
  };

  const statusIcons: Partial<Record<OptionStatus, React.ReactNode>> = {
    correct: <Check className="h-5 w-5 text-green-600" aria-hidden="true" />,
    incorrect: <X className="h-5 w-5 text-red-600" aria-hidden="true" />,
  };

  return (
    <div className={cn('space-y-3', className)} role="radiogroup" aria-label="Answer options">
      {sortedOptions.map(([key, text]) => {
        const status = getOptionStatus(key);
        const isSelected = key === selectedAnswer;
        const sanitizedText = sanitizeHTML(text);

        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && !hasSubmitted && onSelectOption(key)}
            disabled={disabled || hasSubmitted}
            className={cn(
              'relative flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
              statusStyles[status],
              (disabled || hasSubmitted) && 'cursor-not-allowed',
              !disabled && !hasSubmitted && 'cursor-pointer',
            )}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled || hasSubmitted}
          >
            <span
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-semibold',
                status === 'correct' && 'bg-green-200 text-green-800',
                status === 'incorrect' && 'bg-red-200 text-red-800',
                status === 'selected' && 'bg-blue-200 text-blue-800',
                status === 'default' && 'bg-slate-200 text-slate-700',
              )}
            >
              {key}
            </span>

            <span
              className={cn(
                'flex-1 pt-1 text-base',
                status === 'correct' && 'text-green-800',
                status === 'incorrect' && 'text-red-800',
                status === 'default' && 'text-slate-700',
              )}
              dangerouslySetInnerHTML={{ __html: sanitizedText }}
            />

            {hasSubmitted && statusIcons[status] && (
              <span className="flex-shrink-0 pt-1">{statusIcons[status]}</span>
            )}
          </button>
        );
      })}

      {!hasSubmitted && !disabled && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">A</kbd>,{' '}
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">B</kbd>,{' '}
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">C</kbd>, or{' '}
          <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono">D</kbd> to select
        </p>
      )}
    </div>
  );
}

export default OptionsList;
