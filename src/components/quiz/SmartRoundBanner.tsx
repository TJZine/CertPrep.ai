'use client';

import * as React from 'react';
import { Sparkles, X, Target, Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface SmartRoundBannerProps {
  totalQuestions: number;
  missedCount: number;
  flaggedCount: number;
  onExit: () => void;
  className?: string;
}

/**
 * Banner displayed at the top of Smart Round sessions
 * to indicate this is a focused review session.
 */
export function SmartRoundBanner({
  totalQuestions,
  missedCount,
  flaggedCount,
  onExit,
  className,
}: SmartRoundBannerProps): React.ReactElement {
  return (
    <div
      className={cn(
        'rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 dark:border-purple-800 dark:from-purple-950 dark:to-indigo-950',
        className,
      )}
      role="status"
      aria-label="Smart Round session active"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-300" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-purple-900 dark:text-purple-100">Smart Round</h2>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Focused practice on {totalQuestions} questions you need to review
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="hidden items-center gap-4 sm:flex">
            <div className="flex items-center gap-1.5 text-sm text-purple-700 dark:text-purple-300">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>{missedCount} missed</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-purple-700 dark:text-purple-300">
              <Flag className="h-4 w-4" aria-hidden="true" />
              <span>{flaggedCount} flagged</span>
            </div>
          </div>

          {/* Exit button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExit}
            className="text-purple-700 hover:bg-purple-100 hover:text-purple-900 dark:text-purple-300 dark:hover:bg-purple-900/50 dark:hover:text-purple-100"
            aria-label="Exit Smart Round"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SmartRoundBanner;
