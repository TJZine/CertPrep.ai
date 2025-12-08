"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, RotateCcw, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
    <div className={cn("space-y-4", className)}>
      <p className="text-center text-sm text-muted-foreground">
        How well did you know this?
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          onClick={onAgain}
          className={cn(
            "flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive",
            "sm:flex-initial sm:min-w-[120px]",
          )}
          aria-label="Again - show this question again soon"
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Again
          <span className="ml-2 hidden text-xs text-destructive/70 sm:inline">
            (1)
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={onHard}
          className={cn(
            "flex-1 border-warning/50 text-warning hover:bg-warning/10 hover:text-warning",
            "sm:flex-initial sm:min-w-[120px]",
          )}
          aria-label="Hard - add to review list"
        >
          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
          Hard
          <span className="ml-2 hidden text-xs text-warning/70 sm:inline">
            (2)
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={onGood}
          className={cn(
            "flex-1 border-success/50 text-success hover:bg-success/10 hover:text-success",
            "sm:flex-initial sm:min-w-[120px]",
          )}
          aria-label={
            isLastQuestion
              ? "Good - finish quiz"
              : "Good - continue to next question"
          }
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
          <span className="ml-2 hidden text-xs text-success/70 sm:inline">
            (3)
          </span>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Keyboard shortcuts:{" "}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
          1
        </kbd>{" "}
        Again,{" "}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
          2
        </kbd>{" "}
        Hard,{" "}
        <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
          3
        </kbd>{" "}
        Good
      </p>
    </div>
  );
}

interface NextButtonProps {
  onClick: () => void;
  isLastQuestion?: boolean;
  className?: string;
}

export function NextButton({
  onClick,
  isLastQuestion = false,
  className,
}: NextButtonProps): React.ReactElement {
  return (
    <div className={cn("flex justify-center", className)}>
      <Button
        onClick={onClick}
        rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
      >
        {isLastQuestion ? "Finish Quiz" : "Next Question"}
      </Button>
    </div>
  );
}

interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function SubmitButton({
  onClick,
  disabled = false,
  className,
}: SubmitButtonProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        className="min-w-[200px]"
      >
        Check Answer
      </Button>
      {!disabled && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          or press{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            Enter
          </kbd>
        </p>
      )}
    </div>
  );
}

export default ZenControls;
