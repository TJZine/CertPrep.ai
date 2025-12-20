import { cn } from "@/lib/utils";

/**
 * Skeleton loading placeholder.
 * Includes data-skeleton marker for E2E hydration detection.
 * Only use for loading states. For empty-state or static placeholders,
 * use styled divs directly.
 */
function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
    return (
        <div
            data-skeleton
            className={cn("animate-pulse rounded-md bg-muted", className)}
            {...props}
        />
    );
}

export { Skeleton };
