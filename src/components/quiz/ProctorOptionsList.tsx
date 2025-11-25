'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/sanitize';

interface ProctorOptionsListProps {
  options: Record<string, string>;
  selectedAnswer: string | null;
  onSelectOption: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Options list for Proctor mode - no feedback, just selection state.
 * All options appear neutral until exam is submitted.
 */
export function ProctorOptionsList({
  options,
  selectedAnswer,
  onSelectOption,
  disabled = false,
  className,
}: ProctorOptionsListProps): React.ReactElement {
  const sortedOptions = React.useMemo(() => Object.entries(options).sort(([a], [b]) => a.localeCompare(b)), [options]);

  return (
    <div className={cn('space-y-3', className)} role="radiogroup" aria-label="Answer options">
      {sortedOptions.map(([key, text]) => {
        const isSelected = key === selectedAnswer;
        const sanitizedText = sanitizeHTML(text);

        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onSelectOption(key)}
            disabled={disabled}
            className={cn(
              'relative flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
              isSelected
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-1'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled}
          >
            <span
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-semibold transition-colors',
                isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700',
              )}
            >
              {key}
            </span>

            <span
              className="flex-1 pt-1 text-base text-slate-700"
              dangerouslySetInnerHTML={{ __html: sanitizedText }}
            />

            {isSelected && (
              <span className="flex-shrink-0 pt-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </span>
            )}
          </button>
        );
      })}

      {!disabled && (
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

export default ProctorOptionsList;

