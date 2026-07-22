import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard theme overrides", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    it("contains midnight featured-card override", () => {
        expect(css).toContain('[data-theme="midnight"] .dashboard-featured-card');
    });

    it("contains brutalist card override", () => {
        expect(css).toContain('[data-theme="brutalist"] .dashboard-card');
    });

    it("contains reduced-motion fallback for dashboard cards", () => {
        expect(css).toContain("@media (prefers-reduced-motion: reduce)");
        expect(css).toContain(".dashboard-card");
        expect(css).toContain(".dashboard-featured-card");
    });

    it("preserves leading-icon spacing for Blossom inputs", () => {
        expect(css).toContain('[data-theme="blossom"] input.has-leading-icon');
        expect(css).toContain("padding-left: 2.25rem !important");
    });
});
