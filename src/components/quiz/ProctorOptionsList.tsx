"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";

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
  const sortedOptions = React.useMemo(
    () => Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
    [options],
  );

  return (
    <div
      className={cn("space-y-3", className)}
      role="radiogroup"
      aria-label="Answer options"
    >
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
              "relative flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "border-border bg-card hover:border-muted-foreground/50 hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled}
          >
            <span
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-semibold transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {key}
            </span>

            <span
              className="flex-1 pt-1 text-base text-foreground break-words"
              dangerouslySetInnerHTML={{ __html: sanitizedText }}
            />

            {isSelected && (
              <span className="flex-shrink-0 pt-1">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <svg
                    className="h-3 w-3 text-primary-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </span>
              </span>
            )}
          </button>
        );
      })}

      {!disabled && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            A
          </kbd>
          ,{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            B
          </kbd>
          ,{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            C
          </kbd>
          , or{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            D
          </kbd>{" "}
          to select
        </p>
      )}
    </div>
  );
}

export default ProctorOptionsList;
