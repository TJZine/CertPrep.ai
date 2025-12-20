/**
 * Shared CLI utilities for CertPrep.ai scripts.
 * Extracted from cls-audit.mjs and lighthouse-e2e.mjs to reduce duplication.
 */

export const DEFAULT_VIEWPORT = { width: 1350, height: 940 };

/**
 * Parse CLI arguments into a Map.
 * Supports --key value and --flag patterns.
 */
export function parseArgs(argv) {
    const args = new Map();
    for (let i = 2; i < argv.length; i += 1) {
        const key = argv[i];
        const value = argv[i + 1];
        if (!key || !key.startsWith("--")) continue;
        if (!value || value.startsWith("--")) {
            args.set(key, true);
            i -= 1;
            continue;
        }
        args.set(key, value);
    }
    return args;
}

/**
 * Parse viewport string in WxH format (e.g., "1920x1080").
 * Returns null if invalid.
 */
export function parseViewport(value) {
    if (typeof value !== "string") return null;
    const match = value.trim().match(/^(\d{2,5})x(\d{2,5})$/i);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    if (width < 200 || height < 200) return null;
    return { width, height };
}

/**
 * Resolve viewport from CLI args with preset support.
 * Presets: mobile (390x844), ipad (820x1180), desktop (1350x940)
 */
export function resolveViewport(args, defaultViewport = DEFAULT_VIEWPORT) {
    const preset = args.get("--preset");
    if (preset === "mobile") return { width: 390, height: 844 };
    if (preset === "ipad") return { width: 820, height: 1180 };
    if (preset === "desktop") return { ...defaultViewport };

    const viewportArg = args.get("--viewport");
    const parsed = parseViewport(typeof viewportArg === "string" ? viewportArg : "");
    if (parsed) return parsed;

    const widthArg = args.get("--width");
    const heightArg = args.get("--height");
    if (typeof widthArg === "string" && typeof heightArg === "string") {
        const width = Number(widthArg);
        const height = Number(heightArg);
        if (Number.isFinite(width) && Number.isFinite(height) && width >= 200 && height >= 200) {
            return { width, height };
        }
    }

    return { ...defaultViewport };
}

/**
 * Resolve Lighthouse form factor from args or infer from viewport.
 */
export function resolveFormFactor(args, viewport) {
    const arg = args.get("--formFactor");
    if (arg === "mobile" || arg === "desktop") return arg;
    return viewport.width <= 480 ? "mobile" : "desktop";
}

/**
 * Format a number as pixels, handling NaN and nulls.
 */
export function formatNumber(value) {
    if (typeof value !== "number" || Number.isNaN(value)) return "n/a";
    return `${Math.round(value)}px`;
}
