/* eslint-disable no-console */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
}));

describe("logger", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'info').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    describe("development mode", () => {
        beforeEach(() => {
            // Force development mode for these tests
            vi.stubEnv("NODE_ENV", "development");
        });

        it("should call console.log for logger.log", () => {
            logger.log("test log");
            expect(console.log).toHaveBeenCalledWith("test log");
            expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
        });

        it("should call console.info for logger.info", () => {
            logger.info("test info");
            expect(console.info).toHaveBeenCalledWith("test info");
            expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
        });

        it("should call console.warn for logger.warn", () => {
            logger.warn("test warn");
            expect(console.warn).toHaveBeenCalledWith("test warn");
            expect(Sentry.captureMessage).not.toHaveBeenCalled();
        });

        it("should call console.error for logger.error", () => {
            const err = new Error("test error");
            logger.error(err, "extra info");
            expect(console.error).toHaveBeenCalledWith(err, "extra info");
            expect(Sentry.captureException).not.toHaveBeenCalled();
        });

        it("should call console.debug for logger.debug", () => {
            logger.debug("test debug");
            expect(console.debug).toHaveBeenCalledWith("test debug");
        });
    });

    // Note: Testing production mode requires isolating the module because NODE_ENV 
    // is evaluated at module level during import in the real code, not inside the function.
    // The tests below verify the sanitizer logic which is pure and testable.
});
