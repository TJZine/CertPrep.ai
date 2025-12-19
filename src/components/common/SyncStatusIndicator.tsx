"use client";

import * as React from "react";
import { CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSync } from "@/hooks/useSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useAuth } from "@/components/providers/AuthProvider";

type SyncState = "syncing" | "saved" | "offline" | "idle";

/**
 * Subtle sync status indicator for the header.
 * Shows syncing state, brief "Saved" confirmation, or offline status.
 * 
 * Uses a fixed-width wrapper with opacity toggle to prevent CLS.
 */
export function SyncStatusIndicator(): React.ReactElement {
    const { user } = useAuth();
    const { isSyncing, hasInitialSyncCompleted } = useSync();
    const { isOnline } = useOnlineStatus();

    const [showSaved, setShowSaved] = React.useState(false);
    const prevSyncingRef = React.useRef(false);

    // Detect sync completion to show "Saved" briefly
    React.useEffect((): void | (() => void) => {
        if (prevSyncingRef.current && !isSyncing && hasInitialSyncCompleted) {
            setShowSaved(true);
            const timer = setTimeout((): void => setShowSaved(false), 3000);
            return (): void => clearTimeout(timer);
        }
        prevSyncingRef.current = isSyncing;
    }, [isSyncing, hasInitialSyncCompleted]);

    // Determine current state
    let state: SyncState = "idle";
    if (!user) {
        // Keep idle for unauthenticated - wrapper will be invisible
        state = "idle";
    } else if (!isOnline) {
        state = "offline";
    } else if (isSyncing) {
        state = "syncing";
    } else if (showSaved) {
        state = "saved";
    }

    const isVisible = state !== "idle";

    // Always render a fixed-width wrapper to prevent CLS
    // Use opacity toggle with smooth transition instead of conditional mounting
    return (
        <div
            className={cn(
                "w-[72px] transition-opacity duration-300 ease-in-out",
                isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            role="status"
            aria-live="polite"
            aria-hidden={!isVisible}
        >
            <div
                className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    state === "syncing" && "text-muted-foreground",
                    state === "saved" && "text-success",
                    state === "offline" && "text-warning",
                )}
            >
                {state === "syncing" && (
                    <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        <span>Syncing...</span>
                    </>
                )}
                {state === "saved" && (
                    <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Saved</span>
                    </>
                )}
                {state === "offline" && (
                    <>
                        <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Offline</span>
                    </>
                )}
            </div>
        </div>
    );
}

export default SyncStatusIndicator;

