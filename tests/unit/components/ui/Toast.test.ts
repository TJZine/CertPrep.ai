import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as React from "react";
import { ToastProvider, useToast, DEDUP_WINDOW_MS } from "@/components/ui/Toast";

/**
 * Helper wrapper for rendering hooks that need ToastProvider context.
 */
function createWrapper(): React.FC<{ children: React.ReactNode }> {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(ToastProvider, null, children);
    };
}

describe("ToastProvider", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("basic functionality", () => {
        it("provides toast context to children", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            expect(result.current.addToast).toBeDefined();
            expect(result.current.removeToast).toBeDefined();
            expect(result.current.toasts).toEqual([]);
        });

        it("throws error when useToast is used outside provider", () => {
            // Suppress console.error for expected React error
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            expect(() => {
                renderHook(() => useToast());
            }).toThrow("useToast must be used within a ToastProvider");

            consoleSpy.mockRestore();
        });

        it("adds a toast to the stack", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("success", "Operation successful");
            });

            expect(result.current.toasts).toHaveLength(1);
            expect(result.current.toasts[0]).toMatchObject({
                type: "success",
                message: "Operation successful",
            });
        });

        it("removes a toast by ID", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("info", "Test message");
            });

            expect(result.current.toasts).toHaveLength(1);
            const toastId = result.current.toasts[0]?.id;
            expect(toastId).toBeDefined();

            act(() => {
                result.current.removeToast(toastId!);
            });

            expect(result.current.toasts).toHaveLength(0);
        });

        it("auto-dismisses toast after duration", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("success", "Auto-dismiss test", 5000);
            });

            expect(result.current.toasts).toHaveLength(1);

            // Fast-forward past the duration
            act(() => {
                vi.advanceTimersByTime(5001);
            });

            expect(result.current.toasts).toHaveLength(0);
        });

        it("does not auto-dismiss when duration is 0", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("warning", "Persistent toast", 0);
            });

            expect(result.current.toasts).toHaveLength(1);

            // Fast-forward a long time
            act(() => {
                vi.advanceTimersByTime(60000);
            });

            // Toast should still be there
            expect(result.current.toasts).toHaveLength(1);
        });
    });

    describe("deduplication", () => {
        it("prevents duplicate toasts within debounce window", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                // Fire the same toast twice rapidly
                result.current.addToast("error", "Duplicate message");
                result.current.addToast("error", "Duplicate message");
            });

            // Should only have 1 toast due to deduplication
            expect(result.current.toasts).toHaveLength(1);
        });

        it("allows same message after debounce window expires", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("error", "Repeated message");
            });

            expect(result.current.toasts).toHaveLength(1);

            // Advance past the debounce window
            act(() => {
                vi.advanceTimersByTime(DEDUP_WINDOW_MS + 1);
            });

            act(() => {
                result.current.addToast("error", "Repeated message");
            });

            // Now should have 2 toasts
            expect(result.current.toasts).toHaveLength(2);
        });

        it("allows different messages within debounce window", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("success", "Message A");
                result.current.addToast("success", "Message B");
                result.current.addToast("error", "Message A"); // Different type
            });

            // All 3 should appear (different type:message combos)
            expect(result.current.toasts).toHaveLength(3);
        });

        it("deduplicates based on type AND message combo", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("success", "Same text");
                result.current.addToast("error", "Same text"); // Different type, allowed
                result.current.addToast("success", "Same text"); // Duplicate, blocked
            });

            expect(result.current.toasts).toHaveLength(2);
            expect(result.current.toasts.map((t) => t.type)).toEqual([
                "success",
                "error",
            ]);
        });

        it("handles rapid triple-fire (common in StrictMode)", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                // Simulate StrictMode double-invoke + user action
                result.current.addToast("info", "StrictMode test");
                result.current.addToast("info", "StrictMode test");
                result.current.addToast("info", "StrictMode test");
            });

            expect(result.current.toasts).toHaveLength(1);
        });
    });

    describe("multiple toast types", () => {
        it("supports all toast types", () => {
            const { result } = renderHook(() => useToast(), {
                wrapper: createWrapper(),
            });

            act(() => {
                result.current.addToast("success", "Success message");
                result.current.addToast("error", "Error message");
                result.current.addToast("warning", "Warning message");
                result.current.addToast("info", "Info message");
            });

            expect(result.current.toasts).toHaveLength(4);
            expect(result.current.toasts.map((t) => t.type)).toEqual([
                "success",
                "error",
                "warning",
                "info",
            ]);
        });
    });
});
