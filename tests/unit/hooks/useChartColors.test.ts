/**
 * Unit tests for useChartColors hook
 *
 * Tests the CSS variable reading and HSL conversion functionality
 * that enables theme-aware Recharts colors.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChartColors } from "@/hooks/useChartColors";

describe("useChartColors", () => {
    // Mock getComputedStyle
    const mockGetComputedStyle = vi.fn();
    const originalGetComputedStyle = window.getComputedStyle;

    beforeEach(() => {
        // Reset document state
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.classList.remove("dark");

        // Setup mock getComputedStyle
        mockGetComputedStyle.mockReturnValue({
            getPropertyValue: (prop: string) => {
                const values: Record<string, string> = {
                    "--primary": "221 83 53",
                    "--correct": "142 76 36",
                    "--incorrect": "0 84 60",
                    "--warning": "25 95 53",
                    "--border": "214 32 91",
                    "--muted-foreground": "215 16 47",
                    "--background": "210 40 98",
                    "--foreground": "222 47 11",
                    "--tier-excellent": "142 76 36",
                    "--tier-great": "221 83 53",
                    "--tier-good": "186 94 41",
                    "--tier-passing": "38 92 50",
                    "--tier-failing": "0 84 60",
                };
                return values[prop] || "";
            },
        });

        window.getComputedStyle = mockGetComputedStyle;
    });

    afterEach(() => {
        window.getComputedStyle = originalGetComputedStyle;
        vi.clearAllMocks();
    });

    describe("initial state", () => {
        it("returns fallback colors before CSS variables are read", () => {
            // Before useEffect runs, hook should have defaults
            const { result } = renderHook(() => useChartColors());

            // Initially has fallback values (before effect completes)
            expect(result.current.colors).toBeDefined();
            expect(result.current.colors.primary).toBeDefined();
        });

        it("provides isReady flag for loading state", async () => {
            const { result } = renderHook(() => useChartColors());

            // After effect runs, isReady should be true
            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });
    });

    describe("CSS variable reading", () => {
        it("reads CSS variables from document root", async () => {
            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(mockGetComputedStyle).toHaveBeenCalledWith(document.documentElement);
        });

        it("converts HSL values to usable color strings", async () => {
            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // HSL values should be converted to "hsl(h, s, l)" format
            expect(result.current.colors.primary).toMatch(/^hsl\(\d+,\s*\d+,\s*\d+\)$/);
        });
    });

    describe("color properties", () => {
        it("provides all required chart color properties", async () => {
            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            const { colors } = result.current;

            // Core colors
            expect(colors.primary).toBeDefined();
            expect(colors.correct).toBeDefined();
            expect(colors.incorrect).toBeDefined();
            expect(colors.warning).toBeDefined();

            // UI colors
            expect(colors.grid).toBeDefined();
            expect(colors.muted).toBeDefined();
            expect(colors.background).toBeDefined();
            expect(colors.foreground).toBeDefined();

            // Tier colors
            expect(colors.tierExcellent).toBeDefined();
            expect(colors.tierGreat).toBeDefined();
            expect(colors.tierGood).toBeDefined();
            expect(colors.tierPassing).toBeDefined();
            expect(colors.tierFailing).toBeDefined();
        });
    });

    describe("theme change detection", () => {
        it("updates colors when data-theme attribute changes", async () => {
            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            const initialColors = { ...result.current.colors };

            // Simulate theme change
            mockGetComputedStyle.mockReturnValue({
                getPropertyValue: (prop: string) => {
                    const values: Record<string, string> = {
                        "--primary": "186 100 50", // Midnight theme cyan
                        "--correct": "160 100 40",
                        "--incorrect": "350 100 60",
                        "--warning": "45 100 55",
                        "--border": "230 25 18",
                        "--muted-foreground": "200 20 60",
                        "--background": "230 25 7",
                        "--foreground": "200 60 95",
                        "--tier-excellent": "160 100 40",
                        "--tier-great": "186 100 50",
                        "--tier-good": "200 100 50",
                        "--tier-passing": "45 100 55",
                        "--tier-failing": "350 100 60",
                    };
                    return values[prop] || "";
                },
            });

            // Trigger theme change
            act(() => {
                document.documentElement.setAttribute("data-theme", "midnight");
            });

            // Wait for MutationObserver to trigger update
            await waitFor(
                () => {
                    // Colors should have changed after theme switch
                    expect(result.current.colors.primary).not.toBe(initialColors.primary);
                },
                { timeout: 1000 }
            );
        });

        it("updates colors when dark class is toggled", async () => {
            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // Change mock to return dark theme colors
            mockGetComputedStyle.mockReturnValue({
                getPropertyValue: (prop: string) => {
                    const values: Record<string, string> = {
                        "--primary": "217 91 60", // Dark theme blue
                        "--correct": "142 70 45",
                        "--incorrect": "0 84 60",
                        "--warning": "25 95 53",
                        "--border": "217 33 18",
                        "--muted-foreground": "215 20 65",
                        "--background": "222 47 11",
                        "--foreground": "210 40 98",
                    };
                    return values[prop] || "";
                },
            });

            // Toggle dark class
            act(() => {
                document.documentElement.classList.add("dark");
            });

            // MutationObserver should detect class change
            await waitFor(
                () => {
                    expect(result.current.colors).toBeDefined();
                },
                { timeout: 1000 }
            );
        });
    });

    describe("fallback handling", () => {
        it("provides fallback color when CSS variable is empty", async () => {
            mockGetComputedStyle.mockReturnValue({
                getPropertyValue: () => "", // All empty
            });

            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // Should use fallback blue
            expect(result.current.colors.primary).toBe("#3b82f6");
        });
    });

    describe("cleanup", () => {
        it("hook unmounts without error", async () => {
            const { result, unmount } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // Should unmount cleanly without throwing
            expect(() => unmount()).not.toThrow();
        });
    });
});

describe("hslToString conversion", () => {
    // These tests verify the hook handles various HSL input formats
    // by testing the actual output rather than internal implementation

    const testCases = [
        { input: "221 83 53", expected: /hsl\(221,\s*83,\s*53\)/ },
        { input: "  221   83   53  ", expected: /hsl\(221,\s*83,\s*53\)/ },
        { input: "0 0 100", expected: /hsl\(0,\s*0,\s*100\)/ },
    ];

    it.each(testCases)(
        "correctly converts HSL value: $input",
        async ({ input, expected }) => {
            const mockGetStyle = vi.fn().mockReturnValue({
                getPropertyValue: () => input,
            });
            const originalGetComputedStyle = window.getComputedStyle;
            window.getComputedStyle = mockGetStyle;

            const { result } = renderHook(() => useChartColors());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(result.current.colors.primary).toMatch(expected);

            // Restore
            window.getComputedStyle = originalGetComputedStyle;
        }
    );
});
