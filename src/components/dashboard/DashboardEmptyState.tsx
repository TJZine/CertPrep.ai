import * as React from "react";
import { cn } from "@/lib/utils";

interface DashboardEmptyStateProps {
    title: string;
    description: string;
    testId: string;
    className?: string;
}

export function DashboardEmptyState({
    title,
    description,
    testId,
    className,
}: DashboardEmptyStateProps): React.ReactElement {
    return (
        <div
            data-testid={testId}
            role="region"
            aria-label={title}
            className={cn(
                "rounded-xl border-2 border-border bg-card/80 px-6 py-8 text-center shadow-[6px_6px_0_0_hsl(var(--border))]",
                "motion-reduce:transform-none",
                className,
            )}
        >
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="mt-2 break-words text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
