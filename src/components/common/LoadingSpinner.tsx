"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeMap: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * Spinner with optional label and full-screen mode.
 */
export function LoadingSpinner({
  size = "md",
  text = "Loading...",
  className,
  fullScreen = false,
}: LoadingSpinnerProps): React.ReactElement {
  const spinner = (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-blue-600", sizeMap[size])}
        aria-hidden="true"
      />
      {text ? <span>{text}</span> : null}
      <span className="sr-only">{text}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur dark:bg-slate-950/80">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
