"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type DateRange = "7d" | "30d" | "90d" | "all";

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const RANGES: { value: DateRange; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

/**
 * A segmented control for filtering analytics data by date range.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps): React.ReactElement {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card p-1 shadow-sm",
        className
      )}
      role="group"
      aria-label="Date range filter"
    >
      {RANGES.map((range) => {
        const isSelected = value === range.value;
        return (
          <Button
            key={range.value}
            variant={isSelected ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onChange(range.value)}
            className={cn(
              "h-7 rounded-md px-3 text-xs font-medium",
              isSelected && "bg-secondary text-secondary-foreground shadow-sm",
              !isSelected && "text-muted-foreground hover:text-foreground"
            )}
            aria-pressed={isSelected}
          >
            {range.label}
          </Button>
        );
      })}
    </div>
  );
}
