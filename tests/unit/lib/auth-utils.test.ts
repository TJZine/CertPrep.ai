import { describe, expect, it, vi, afterEach } from "vitest";
import { getAuthErrorMessage } from "@/lib/auth-utils";
import { AuthError } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// Mock logger to avoid console spam and verify calls
vi.mock("@/lib/logger", () => ({
    logger: {
        log: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

describe("getAuthErrorMessage", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty string for null or undefined error", () => {
        expect(getAuthErrorMessage(null)).toBe("");
        expect(getAuthErrorMessage(undefined)).toBe("");
    });

    it("returns context-specific message for signup", () => {
        const error = new AuthError("Some error", 400);
        const msg = getAuthErrorMessage(error, "signup");
        expect(msg).toBe("Unable to create account. Please try again.");
    });

    it("returns context-specific message for profile update", () => {
        const error = new AuthError("Some error", 400);
        const msg = getAuthErrorMessage(error, "profile");
        expect(msg).toBe("Unable to update profile. Please try again.");
    });

    it("returns default message for login context", () => {
        const error = new AuthError("Some error", 400);
        const msg = getAuthErrorMessage(error, "login");
        expect(msg).toBe("Invalid email or password. Please try again.");
    });

    it("identifies AuthError instances correctly", () => {
        const error = new AuthError("Invalid credentials", 400);
        getAuthErrorMessage(error);

        expect(logger.warn).toHaveBeenCalledWith("Auth Warning:", {
            status: 400,
            name: "AuthError",
        });
    });

    it("handles generic error objects with name property", () => {
        const error = { name: "CustomError", message: "Something went wrong" };
        getAuthErrorMessage(error);

        expect(logger.warn).toHaveBeenCalledWith("Auth Warning:", {
            status: undefined,
            name: "CustomError",
        });
    });

    it("defaults to UnknownError for weird objects", () => {
        const error = "just a string";
        getAuthErrorMessage(error);

        expect(logger.warn).toHaveBeenCalledWith("Auth Warning:", {
            status: undefined,
            name: "UnknownError",
        });
    });

    it("logs as error for 500+ status codes", () => {
        const error = new AuthError("Server exploded", 500);
        getAuthErrorMessage(error);

        expect(logger.error).toHaveBeenCalledWith("Auth Error:", {
            status: 500,
            name: "AuthError",
        });
    });

    it("logs as warn for 4xx status codes", () => {
        const error = new AuthError("Bad request", 422);
        getAuthErrorMessage(error);

        expect(logger.warn).toHaveBeenCalledWith("Auth Warning:", {
            status: 422,
            name: "AuthError",
        });
    });
});
