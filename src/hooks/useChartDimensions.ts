"use client";

import * as React from "react";

interface ChartDimensions {
    width: number;
    height: number;
}

interface UseChartDimensionsResult {
    /** Ref to attach to the chart container element */
    containerRef: React.RefObject<HTMLDivElement | null>;
    /** Current dimensions of the container (0,0 until measured) */
    dimensions: ChartDimensions;
    /** Whether the container has valid dimensions for rendering a chart */
    isReady: boolean;
}

/**
 * Hook to safely measure chart container dimensions before rendering.
 *
 * Recharts' ResponsiveContainer can throw warnings when rendered in containers
 * with zero or negative dimensions (e.g., during SSR hydration or visibility
 * transitions). This hook delays chart rendering until valid dimensions are
 * measured.
 *
 * @example
 * ```tsx
 * function MyChart({ data }) {
 *   const { containerRef, isReady } = useChartDimensions();
 *
 *   return (
 *     <div ref={containerRef} className="h-[250px]">
 *       {isReady ? (
 *         <ResponsiveContainer width="100%" height="100%">
 *           <LineChart data={data}>...</LineChart>
 *         </ResponsiveContainer>
 *       ) : (
 *         <ChartSkeleton />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChartDimensions(): UseChartDimensionsResult {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [dimensions, setDimensions] = React.useState<ChartDimensions>({
        width: 0,
        height: 0,
    });

    React.useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const updateDimensions = (): void => {
            const { width, height } = element.getBoundingClientRect();
            // Only update if dimensions are valid to prevent re-render loops
            if (width > 0 && height > 0) {
                setDimensions((prev) => {
                    if (prev.width === width && prev.height === height) return prev;
                    return { width, height };
                });
            }
        };

        // Initial measurement
        updateDimensions();

        // Observe resize changes
        const observer = new ResizeObserver((): void => {
            updateDimensions();
        });

        observer.observe(element);

        return (): void => {
            observer.disconnect();
        };
    }, []);

    const isReady = dimensions.width > 0 && dimensions.height > 0;

    return {
        containerRef,
        dimensions,
        isReady,
    };
}

export default useChartDimensions;
