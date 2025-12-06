"use client";
import * as React from "react";
import { formatTime } from "@/lib/utils";
import { TIMER } from "@/lib/constants";

export interface TimerProps {
  secondsRemaining: number;
}

/**
 * Countdown timer placeholder.
 */
export function Timer({ secondsRemaining }: TimerProps): React.ReactElement {
  const warning = secondsRemaining <= TIMER.WARNING_THRESHOLD_SECONDS;

  return (
    <div className="text-sm font-semibold">
      <span
        className={
          warning
            ? "text-red-600 dark:text-red-300"
            : "text-slate-800 dark:text-slate-100"
        }
      >
        {formatTime(Math.max(secondsRemaining, 0))}
      </span>
    </div>
  );
}

export default Timer;
