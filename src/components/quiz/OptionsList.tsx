"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHTML } from "@/lib/sanitize";

interface OptionsListProps {
  options: Record<string, string>;
  selectedAnswer: string | null;
  correctAnswer?: string;
  hasSubmitted: boolean;
  onSelectOption: (key: string) => void;
  disabled?: boolean;
  isResolving?: boolean;
  className?: string;
}

type OptionStatus = "default" | "selected" | "correct" | "incorrect";

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
  isResolving = false,
  className,
}: OptionsListProps): React.ReactElement {
  const sortedOptions = React.useMemo(
    () => Object.entries(options).sort(([a], [b]) => a.localeCompare(b)),
    [options],
  );

  const getOptionStatus = (key: string): OptionStatus => {
    if (!hasSubmitted || isResolving) {
      return key === selectedAnswer ? "selected" : "default";
    }
    if (key === correctAnswer) return "correct";
    if (key === selectedAnswer && key !== correctAnswer) return "incorrect";
    return "default";
  };

  const statusStyles: Record<OptionStatus, string> = {
    default:
      "border-border bg-card hover:border-primary/30 hover:bg-muted/50",
    selected:
      "border-primary bg-primary/10 ring-2 ring-primary ring-offset-1 ring-offset-background",
    correct:
      "border-correct bg-correct/10",
    incorrect:
      "border-incorrect bg-incorrect/10",
  };

  const statusIcons: Partial<Record<OptionStatus, React.ReactNode>> = {
    correct: <Check className="h-5 w-5 text-correct" aria-hidden="true" />,
    incorrect: <X className="h-5 w-5 text-incorrect" aria-hidden="true" />,
  };

  return (
    <div
      className={cn("space-y-3", className)}
      role="radiogroup"
      aria-label="Answer options"
    >
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
              "relative flex w-full items-start gap-3 rounded-lg border-2 p-4 text-left transition-all",
              statusStyles[status],
              (disabled || hasSubmitted) && "cursor-not-allowed",
              !disabled && !hasSubmitted && "cursor-pointer",
            )}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={disabled || hasSubmitted}
          >
            <span
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-semibold",
                status === "correct" &&
                "bg-correct/20 text-correct",
                status === "incorrect" &&
                "bg-incorrect/20 text-incorrect",
                status === "selected" &&
                "bg-primary/20 text-primary",
                status === "default" &&
                "bg-muted text-muted-foreground",
              )}
            >
              {key}
            </span>

            <span
              className={cn(
                "flex-1 pt-1 text-base",
                status === "correct" && "text-correct",
                status === "incorrect" && "text-incorrect",
                status === "selected" && "text-primary",
                status === "default" && "text-foreground",
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

export default OptionsList;
