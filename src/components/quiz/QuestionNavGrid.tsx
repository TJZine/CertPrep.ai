"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

type QuestionStatus = "unseen" | "seen" | "answered" | "flagged";

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
    unseen:
      "bg-muted text-muted-foreground hover:bg-muted/80",
    seen: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    answered:
      "bg-primary text-primary-foreground hover:bg-primary/90",
    flagged:
      "bg-flagged text-flagged-foreground hover:bg-flagged/90",
  };

  const statusLabels: Record<QuestionStatus, string> = {
    unseen: "Not viewed",
    seen: "Viewed, not answered",
    answered: "Answered",
    flagged: "Flagged for review",
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
    <div className={cn("flex flex-col", className)}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">
        Question Navigator
      </h3>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-primary" aria-hidden="true" />
          <span>{stats.answered} answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-flagged" aria-hidden="true" />
          <span>{stats.flagged} flagged</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded bg-secondary"
            aria-hidden="true"
          />
          <span>{stats.seen} viewed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded border border-border bg-muted"
            aria-hidden="true"
          />
          <span>{stats.unseen} unseen</span>
        </div>
      </div>

      <div
        className="grid grid-cols-5 gap-1.5 p-1"
        role="navigation"
        aria-label="Question navigation"
      >
        {questions.map((question) => {
          const isCurrent = question.index === currentIndex;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onNavigate(question.index)}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-sm font-medium transition-all",
                statusStyles[question.status],
                isCurrent &&
                "border-2 border-foreground shadow-sm",
              )}
              aria-label={`Question ${question.index + 1}: ${statusLabels[question.status]}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {question.index + 1}
              {question.status === "flagged" ? (
                <Flag
                  className="absolute -right-1 -top-1 h-3 w-3 text-flagged"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Legend
        </p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded border border-border bg-muted" />
            <span>Unseen</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-secondary" />
            <span>Viewed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-primary" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded bg-flagged" />
            <span>Flagged</span>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Shortcuts
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Next question</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              →
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Previous question</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              ←
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Flag question</span>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
              F
            </kbd>
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
      const currentButton = containerRef.current.querySelector<HTMLElement>(
        `[data-index="${currentIndex}"]`,
      );
      currentButton?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [currentIndex]);

  const statusStyles: Record<QuestionStatus, string> = {
    unseen: "bg-muted text-muted-foreground",
    seen: "bg-secondary text-secondary-foreground",
    answered: "bg-primary text-primary-foreground hover:bg-primary/90",
    flagged:
      "bg-flagged text-flagged-foreground hover:bg-flagged/90",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin",
        className,
      )}
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
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-transparent text-xs font-medium transition-all",
              statusStyles[question.status],
              isCurrent &&
              "border-2 border-foreground shadow-sm",
            )}
            aria-current={isCurrent ? "step" : undefined}
          >
            {question.index + 1}
          </button>
        );
      })}
    </div>
  );
}

export default QuestionNavGrid;
