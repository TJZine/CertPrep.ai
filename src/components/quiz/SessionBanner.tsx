"use client";

import * as React from "react";
import { Sparkles, X, Target, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface SessionBannerProps {
  totalQuestions: number;
  missedCount: number;
  flaggedCount: number;
  onExit: () => void;
  /** Optional custom title (defaults to "Smart Round") */
  title?: string;
  className?: string;
}

/**
 * Banner displayed at the top of study sessions (Smart Round, Topic Study, SRS Review)
 * to indicate this is a focused review session.
 */
export function SessionBanner({
  totalQuestions,
  missedCount,
  flaggedCount,
  onExit,
  title = "Smart Round",
  className,
}: SessionBannerProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-lg border border-accent/30 bg-gradient-to-r from-accent/10 to-accent/5 p-4",
        className,
      )}
      role="status"
      aria-label={`${title} session active`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
            <Sparkles
              className="h-5 w-5 text-accent"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 className="font-semibold text-accent">
              {title}
            </h2>
            <p className="text-sm text-accent/80">
              Focused practice on {totalQuestions} questions you need to review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden items-center gap-4 sm:flex">
            <div className="flex items-center gap-1.5 text-sm text-accent/80">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>{missedCount} missed</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-accent/80">
              <Flag className="h-4 w-4" aria-hidden="true" />
              <span>{flaggedCount} flagged</span>
            </div>
          </div>

          {/* Exit button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-accent hover:bg-accent/20 hover:text-accent"
            aria-label={`Exit ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SessionBanner;
