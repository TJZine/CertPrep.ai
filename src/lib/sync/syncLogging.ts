import { logger } from "@/lib/logger";

interface SlowSyncStats {
    duration: number;
    pushed: number;
    pulled: number;
    effectiveType?: string;
    [key: string]: unknown;
}

/**
 * Logs a slow sync warning/debug message based on network conditions.
 * Used to avoid noisy warnings when the user is on a known slow connection.
 */
export function logNetworkAwareSlowSync(
    context: string,
    stats: Omit<SlowSyncStats, "effectiveType">,
): void {
    // Check connection quality to avoid noisy warnings on slow mobile networks
    let effectiveType: string | undefined;
    if (typeof navigator !== "undefined") {
        const connection = (
            navigator as Navigator & {
                connection?: { effectiveType?: string; downlink?: number };
            }
        ).connection;
        effectiveType = connection?.effectiveType;
    }

    const logData = {
        ...stats,
        effectiveType: effectiveType ?? "unknown",
    };

    if (effectiveType && ["slow-2g", "2g", "3g"].includes(effectiveType)) {
        logger.debug(
            `${context} slower than threshold on mobile connection`,
            logData,
        );
    } else {
        logger.warn(`Slow ${context} detected`, logData);
    }
}
