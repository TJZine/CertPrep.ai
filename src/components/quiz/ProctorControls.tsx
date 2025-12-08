"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  FlagOff,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-center">
        {hasAnswer ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info/10 px-3 py-1 text-sm font-medium text-info">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Answer recorded
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1 text-sm font-medium text-warning">
            <AlertTriangle className="h-4 w-4" />
            No answer selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 text-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstQuestion}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
          aria-label="Previous question"
          className="justify-self-start"
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>

        <Button
          variant={isFlagged ? "warning" : "outline"}
          onClick={onToggleFlag}
          aria-label={isFlagged ? "Remove flag" : "Flag for review"}
          aria-pressed={isFlagged}
          leftIcon={
            isFlagged ? (
              <Flag className="h-4 w-4 fill-current" />
            ) : (
              <FlagOff className="h-4 w-4" />
            )
          }
          className="justify-self-center"
        >
          {isFlagged ? (
            "Flagged"
          ) : (
            <>
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
          className="justify-self-end"
        >
          <span className="hidden sm:inline">Next</span>
        </Button>
      </div>

      <div className="border-t border-border pt-4">
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
        <p className="mt-2 text-center text-xs text-muted-foreground">
          You can review and change answers before submitting
        </p>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <span className="hidden sm:inline">
          Use{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            ←
          </kbd>{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            →
          </kbd>{" "}
          to navigate,{" "}
          <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">
            F
          </kbd>{" "}
          to flag
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
    <div className={cn("flex items-center justify-between", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={isFirstQuestion}
        aria-label="Previous question"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleFlag}
        className={cn(isFlagged && "text-flagged")}
        aria-label={isFlagged ? "Remove flag" : "Flag for review"}
      >
        {isFlagged ? (
          <Flag className="h-5 w-5 fill-current" />
        ) : (
          <FlagOff className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={isLastQuestion}
        aria-label="Next question"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default ProctorControls;
