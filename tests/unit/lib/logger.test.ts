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

    describe("production mode", () => {
        let prodLogger: typeof logger;

        beforeEach(async () => {
            vi.stubEnv("NODE_ENV", "production");
            vi.resetModules();
            // Dynamically import to pick up the stubbed NODE_ENV
            const mod = await import("@/lib/logger");
            prodLogger = mod.logger;
        });

        it("should add Sentry breadcrumb for logger.log and NOT call console.log", () => {
            prodLogger.log("test log");
            expect(console.log).not.toHaveBeenCalled();
            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
                message: "test log",
                level: "info",
            }));
        });

        it("should add Sentry breadcrumb for logger.info and NOT call console.info", () => {
            prodLogger.info("test info");
            expect(console.info).not.toHaveBeenCalled();
            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
                message: "test info",
                level: "info",
            }));
        });

        it("should call Sentry.captureMessage for logger.warn and NOT call console.warn", () => {
            prodLogger.warn("test warn");
            expect(console.warn).not.toHaveBeenCalled();
            expect(Sentry.captureMessage).toHaveBeenCalledWith("test warn", "warning");
        });

        it("should call Sentry.captureException for logger.error and NOT call console.error", () => {
            const err = new Error("test error");
            prodLogger.error(err, "extra context");

            // Note: logger.error in production still doesn't call console.error 
            // per its implementation: if (!getIsProduction()) { console.error(...args); }
            expect(console.error).not.toHaveBeenCalled();
            expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({
                extra: expect.any(Object)
            }));
        });

        it("should NO-OP for logger.debug", () => {
            prodLogger.debug("test debug");
            expect(console.debug).not.toHaveBeenCalled();
        });
    });

    describe("sanitizer", () => {
        let prodLogger: typeof logger;

        beforeEach(async () => {
            vi.stubEnv("NODE_ENV", "production");
            vi.resetModules();
            const mod = await import("@/lib/logger");
            prodLogger = mod.logger;
        });

        it("should redact sensitive information in breadcrumbs", () => {
            const sensitiveData = {
                email: "test@example.com",
                token: "Bearer abc123def456",
                password: "password: mySecret123",
                apiKey: "apiKey: KEY_test_AAAAAAAAAAAAAAAAAAAAAAAA"
            };

            prodLogger.log("User data:", sensitiveData);
            
            expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining("[EMAIL_REDACTED]"),
            }));
            
            const call = vi.mocked(Sentry.addBreadcrumb).mock.calls[0]?.[0];
            if (!call) return;
            expect(call.message).toContain("[EMAIL_REDACTED]");
            expect(call.message).toContain("token=[REDACTED]");
            expect(call.message).toContain("password=[REDACTED]");
            expect(call.message).toContain("apiKey=[REDACTED]");
        });
    });
});
