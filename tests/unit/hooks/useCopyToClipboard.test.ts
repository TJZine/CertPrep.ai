import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

describe("useCopyToClipboard", () => {
    const originalClipboard = navigator.clipboard;

    beforeEach(() => {
        vi.useFakeTimers();
        // Mock clipboard API
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: vi.fn().mockResolvedValue(undefined),
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            writable: true,
            configurable: true,
        });
    });

    it("should initialize with copied = false", () => {
        const { result } = renderHook(() => useCopyToClipboard());
        expect(result.current.copied).toBe(false);
    });

    it("should set copied to true after successful copy", async () => {
        const { result } = renderHook(() => useCopyToClipboard());

        await act(async () => {
            await result.current.copyToClipboard("test text");
        });

        expect(result.current.copied).toBe(true);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test text");
    });

    it("should reset copied to false after delay", async () => {
        const { result } = renderHook(() => useCopyToClipboard(1000));

        await act(async () => {
            await result.current.copyToClipboard("test text");
        });

        expect(result.current.copied).toBe(true);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.copied).toBe(false);
    });

    it("should clear previous timeout when copying multiple times", async () => {
        const { result } = renderHook(() => useCopyToClipboard(1000));

        // First copy
        await act(async () => {
            await result.current.copyToClipboard("first");
        });
        expect(result.current.copied).toBe(true);

        // Advance 500ms (halfway through timeout)
        act(() => {
            vi.advanceTimersByTime(500);
        });

        // Second copy before first timeout completes
        await act(async () => {
            await result.current.copyToClipboard("second");
        });
        expect(result.current.copied).toBe(true);

        // Advance another 500ms - first timeout would have fired, but second should keep copied=true
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current.copied).toBe(true);

        // Advance remaining 500ms for second timeout
        act(() => {
            vi.advanceTimersByTime(500);
        });
        expect(result.current.copied).toBe(false);
    });

    it("should cleanup timeout on unmount to prevent memory leaks", async () => {
        const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
        const { result, unmount } = renderHook(() => useCopyToClipboard(1000));

        await act(async () => {
            await result.current.copyToClipboard("test");
        });

        unmount();

        // clearTimeout should be called during cleanup
        expect(clearTimeoutSpy).toHaveBeenCalled();
        clearTimeoutSpy.mockRestore();
    });
});
