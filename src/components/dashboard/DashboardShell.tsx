"use client";

import * as React from "react";

interface DashboardShellProps {
    /**
     * Header slot - always rendered (skeleton or real DashboardHeader)
     */
    headerSlot: React.ReactNode;
    /**
     * StatsBar slot - skeleton placeholder or real StatsBar
     * Has min-h to prevent CLS
     */
    statsSlot?: React.ReactNode;
    /**
     * SRS DueQuestionsCard slot - skeleton or real card
     * Has min-h to prevent CLS
     */
    srsSlot?: React.ReactNode;
    /**
     * Main content slot - QuizGrid skeleton or real grid
     */
    contentSlot: React.ReactNode;
    /**
     * Accessibility label for the loading state
     */
    "aria-label"?: string;
    /**
     * Whether to show loading status for screen readers
     */
    isLoading?: boolean;
}

/**
 * Unified dashboard layout shell that provides consistent structure
 * for both skeleton loading and loaded content states.
 * 
 * This eliminates CLS by ensuring:
 * 1. Same DOM structure during loading and after load
 * 2. Fixed slot heights via min-h constraints
 * 3. Minimum viewport height to prevent footer from moving
 */
export function DashboardShell({
    headerSlot,
    statsSlot,
    srsSlot,
    contentSlot,
    "aria-label": ariaLabel,
    isLoading = false,
}: DashboardShellProps): React.ReactElement {
    return (
        <main
            data-testid="dashboard-shell"
            className="mx-auto max-w-7xl min-h-[calc(100vh-65px)] px-4 py-8 sm:px-6 lg:px-8"
            role={isLoading ? "status" : undefined}
            aria-label={ariaLabel}
        >
            {isLoading && (
                <span className="sr-only">Loading your dashboard...</span>
            )}

            {/* Header slot - always visible */}
            <div>{headerSlot}</div>

            {/* StatsBar slot - min-h prevents collapse during load */}
            {statsSlot !== undefined && (
                <div className="mt-8 min-h-[100px]">{statsSlot}</div>
            )}

            {/* SRS slot - min-h prevents collapse during load */}
            {srsSlot !== undefined && (
                <div className="mt-8 min-h-[48px]">{srsSlot}</div>
            )}

            {/* Content slot - main quiz grid area */}
            <div className="mt-8">{contentSlot}</div>
        </main>
    );
}

export default DashboardShell;
