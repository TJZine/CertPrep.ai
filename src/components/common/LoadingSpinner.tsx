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
        "flex items-center gap-2 text-sm font-medium text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-primary", sizeMap[size])}
        aria-hidden="true"
      />
      {text ? <span>{text}</span> : null}
      {/* Note: Visible text serves as the accessible label; no duplicate sr-only needed */}
    </div>
  );

  if (fullScreen) {
    return (
      // Use solid semi-transparent background instead of backdrop-blur
      // for better performance on low-end devices
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export default LoadingSpinner;
