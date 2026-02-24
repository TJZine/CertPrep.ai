import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard theme overrides", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    it("contains midnight hero-card override", () => {
        expect(css).toContain('[data-theme="midnight"] .dashboard-hero-card');
    });

    it("contains brutalist card override", () => {
        expect(css).toContain('[data-theme="brutalist"] .dashboard-card');
    });

    it("contains reduced-motion fallback for dashboard cards", () => {
        expect(css).toContain("@media (prefers-reduced-motion: reduce)");
        expect(css).toContain(".dashboard-card");
        expect(css).toContain(".dashboard-hero-card");
    });
});
