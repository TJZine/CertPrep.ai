"use client";

import * as React from "react";
import { copyToClipboard as copyToClipboardUtil } from "@/lib/clipboard";

interface UseCopyToClipboardReturn {
    /** Whether text was recently copied (resets after timeout) */
    copied: boolean;
    /** Copy text to clipboard with modern API + fallback */
    copyToClipboard: (text: string) => Promise<void>;
}

/**
 * Hook for copying text to the clipboard with visual feedback.
 *
 * Delegates to the shared clipboard utility which handles the modern
 * Clipboard API with a deprecated `execCommand` fallback for older browsers.
 *
 * @param resetDelayMs - How long to show "copied" state (default: 1500ms)
 */
export function useCopyToClipboard(resetDelayMs = 1500): UseCopyToClipboardReturn {
    const [copied, setCopied] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timeout on unmount to prevent memory leaks
    React.useEffect((): (() => void) => {
        return (): void => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const copyToClipboard = React.useCallback(
        async (text: string): Promise<void> => {
            try {
                await copyToClipboardUtil(text);
                setCopied(true);
                // Clear any existing timeout before setting new one
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
            } catch (error) {
                // Don't set copied=true on failure to avoid false-positive feedback
                console.error("Copy to clipboard failed:", error);
            }
        },
        [resetDelayMs]
    );

    return { copied, copyToClipboard };
}
