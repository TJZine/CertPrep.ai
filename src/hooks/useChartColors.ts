"use client";

import * as React from "react";

/**
 * Chart colors derived from CSS variables for theme-aware Recharts components.
 * These values are read at runtime from the computed styles of :root.
 */
export interface ChartColors {
    /** Primary chart line/bar color */
    primary: string;
    /** Correct answer indicators */
    correct: string;
    /** Incorrect answer indicators */
    incorrect: string;
    /** Warning/flagged indicators */
    warning: string;
    /** Grid lines */
    grid: string;
    /** Axis text and labels */
    muted: string;
    /** Background for tooltips/overlays */
    background: string;
    /** Foreground text */
    foreground: string;
    /** Performance tier: 90-100% (Excellent) */
    tierExcellent: string;
    /** Performance tier: 80-89% (Great) */
    tierGreat: string;
    /** Performance tier: 70-79% (Good) */
    tierGood: string;
    /** Performance tier: 60-69% (Passing) */
    tierPassing: string;
    /** Performance tier: <60% (Failing) */
    tierFailing: string;
}

/**
 * Converts HSL value from CSS variable format to a usable color string.
 * CSS variables store HSL as "220 13% 91%" (space-separated, no commas).
 */
function hslToString(hslValue: string): string {
    const trimmed = hslValue.trim();
    if (!trimmed) return "#3b82f6"; // Fallback to blue-500
    return `hsl(${trimmed.replace(/\s+/g, ", ")})`;
}

/**
 * Reads a CSS variable from the document root.
 */
function getCSSVariable(name: string): string {
    if (typeof window === "undefined") return "";
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
}

/**
 * Hook that provides theme-aware colors for Recharts components.
 * Colors are derived from CSS variables and update when the theme changes.
 *
 * @example
 * ```tsx
 * const { colors } = useChartColors();
 * <Line stroke={colors.primary} />
 * <CartesianGrid stroke={colors.grid} />
 * ```
 */
export function useChartColors(): { colors: ChartColors; isReady: boolean } {
    const [colors, setColors] = React.useState<ChartColors>({
        primary: "#3b82f6",
        correct: "#22c55e",
        incorrect: "#ef4444",
        warning: "#f59e0b",
        grid: "#e2e8f0",
        muted: "#64748b",
        background: "#ffffff",
        foreground: "#0f172a",
        tierExcellent: "#22c55e",
        tierGreat: "#3b82f6",
        tierGood: "#06b6d4",
        tierPassing: "#f59e0b",
        tierFailing: "#ef4444",
    });
    const [isReady, setIsReady] = React.useState(false);

    React.useEffect(() => {
        const updateColors = (): void => {
            const newColors: ChartColors = {
                primary: hslToString(getCSSVariable("--primary")),
                correct: hslToString(getCSSVariable("--correct")),
                incorrect: hslToString(getCSSVariable("--incorrect")),
                warning: hslToString(getCSSVariable("--warning")),
                grid: hslToString(getCSSVariable("--border")),
                muted: hslToString(getCSSVariable("--muted-foreground")),
                background: hslToString(getCSSVariable("--background")),
                foreground: hslToString(getCSSVariable("--foreground")),
                tierExcellent: hslToString(getCSSVariable("--tier-excellent")),
                tierGreat: hslToString(getCSSVariable("--tier-great")),
                tierGood: hslToString(getCSSVariable("--tier-good")),
                tierPassing: hslToString(getCSSVariable("--tier-passing")),
                tierFailing: hslToString(getCSSVariable("--tier-failing")),
            };
            setColors(newColors);
            setIsReady(true);
        };

        // Initial read
        updateColors();

        // Listen for theme changes via MutationObserver on the html element
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === "attributes" &&
                    (mutation.attributeName === "class" ||
                        mutation.attributeName === "data-theme")
                ) {
                    // Small delay to ensure CSS has updated
                    requestAnimationFrame(updateColors);
                    break;
                }
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class", "data-theme"],
        });

        return (): void => observer.disconnect();
    }, []);

    return { colors, isReady };
}

export default useChartColors;
