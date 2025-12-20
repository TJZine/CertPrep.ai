import { cn } from "@/lib/utils";

/**
 * Skeleton loading placeholder.
 * Includes data-skeleton marker for E2E hydration detection.
 * Note: Do not use Skeleton for UI placeholders in loaded state;
 * use regular divs with animate-pulse instead.
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
