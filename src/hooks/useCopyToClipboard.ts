"use client";

import * as React from "react";

interface UseCopyToClipboardReturn {
    /** Whether text was recently copied (resets after timeout) */
    copied: boolean;
    /** Copy text to clipboard with modern API + fallback */
    copyToClipboard: (text: string) => Promise<void>;
}

/**
 * Hook for copying text to the clipboard with visual feedback.
 *
 * Uses the modern Clipboard API with a deprecated `execCommand` fallback
 * for older browsers (Chrome <66, Firefox <63, Safari <13.1).
 *
 * @param resetDelayMs - How long to show "copied" state (default: 1500ms)
 *
 * @remarks The `execCommand` fallback is deprecated but retained for
 * maximum compatibility. It can be safely removed once browser support
 * data confirms <1% usage of legacy browsers (target: Q4 2025).
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
                await navigator.clipboard.writeText(text);
            } catch {
                // Fallback for older browsers (deprecated, see @remarks)
                const textarea = document.createElement("textarea");
                textarea.value = text;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                textarea.setAttribute("aria-hidden", "true");
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);
            }

            setCopied(true);
            // Clear any existing timeout before setting new one
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
        },
        [resetDelayMs]
    );

    return { copied, copyToClipboard };
}
