import { logger } from "@/lib/logger";

interface SlowSyncStats {
    duration: number;
    pushed: number;
    pulled: number;
    effectiveType?: string;
    [key: string]: unknown;
}

/**
 * Returns a network-aware threshold for logging slow syncs.
 * Higher thresholds on slower connections prevent log spam.
 */
function getSlowSyncThreshold(): number {
    if (typeof navigator === "undefined") return 500;

    const connection = (
        navigator as Navigator & {
            connection?: { effectiveType?: string };
        }
    ).connection;

    if (!connection?.effectiveType) return 300;

    switch (connection.effectiveType) {
        case "slow-2g":
        case "2g":
            return 2000;
        case "3g":
            return 1000;
        case "4g":
            return 500;
        default:
            return 300;
    }
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

    const threshold = getSlowSyncThreshold();
    const logData = {
        ...stats,
        effectiveType: effectiveType ?? "unknown",
        threshold,
    };

    // Skip logging if under the dynamic threshold
    if ((stats.duration as number) < threshold) return;

    if (effectiveType && ["slow-2g", "2g", "3g"].includes(effectiveType)) {
        logger.debug(
            `${context} slower than threshold on mobile connection`,
            logData,
        );
    } else {
        logger.warn(`Slow ${context} detected`, logData);
    }
}
