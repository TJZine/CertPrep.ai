import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";

// Mock the clipboard utility
vi.mock("@/lib/clipboard", () => ({
    copyToClipboard: vi.fn(),
}));

import { copyToClipboard as copyToClipboardUtil } from "@/lib/clipboard";

describe("useCopyToClipboard", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // Default: successful copy
        vi.mocked(copyToClipboardUtil).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
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
        expect(copyToClipboardUtil).toHaveBeenCalledWith("test text");
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

    it("should not set copied=true when clipboard utility fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.mocked(copyToClipboardUtil).mockRejectedValue(new Error("Clipboard not available"));

        const { result } = renderHook(() => useCopyToClipboard());

        await act(async () => {
            await result.current.copyToClipboard("test text");
        });

        expect(result.current.copied).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "Copy to clipboard failed:",
            expect.any(Error)
        );

        consoleErrorSpy.mockRestore();
    });

    it("should not start timeout when copy fails", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.mocked(copyToClipboardUtil).mockRejectedValue(new Error("Failed"));

        const { result } = renderHook(() => useCopyToClipboard(1000));

        await act(async () => {
            await result.current.copyToClipboard("test");
        });

        // Advance time - should remain false since no timeout was set
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.copied).toBe(false);
        consoleErrorSpy.mockRestore();
    });
});

