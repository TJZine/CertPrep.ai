import { describe, it, expect, vi } from "vitest";
import {
  createSupabaseClientGetter,
  toErrorMessage,
  toSafeCursorTimestamp,
} from "@/lib/sync/shared";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("src/lib/sync/shared.ts", () => {
  describe("createSupabaseClientGetter", () => {
    it("should cache the client after first call", () => {
      const mockClient = { supabase: true };
      const createClient = vi.fn().mockReturnValue(mockClient);
      const getter = createSupabaseClientGetter(createClient);

      expect(getter()).toBe(mockClient);
      expect(getter()).toBe(mockClient);
      expect(createClient).toHaveBeenCalledTimes(1);
    });

    it("should handle undefined client", () => {
      const createClient = vi.fn().mockReturnValue(undefined);
      const getter = createSupabaseClientGetter(createClient);

      expect(getter()).toBeUndefined();
      expect(createClient).toHaveBeenCalledTimes(1);
    });
  });

  describe("toErrorMessage", () => {
    it("should return message from Error instance", () => {
      expect(toErrorMessage(new Error("test error"))).toBe("test error");
    });

    it("should return string input directly", () => {
      expect(toErrorMessage("string error")).toBe("string error");
    });

    it("should format Supabase-style error objects (sync style)", () => {
      const error = {
        code: "PGRST116",
        message: "No rows found",
        details: "Expected 1 row",
        hint: "Try filtering differently",
      };
      const result = toErrorMessage(error, { style: "sync" });
      expect(result).toContain("[PGRST116]");
      expect(result).toContain("No rows found");
      expect(result).toContain("Details: Expected 1 row");
      expect(result).toContain("Hint: Try filtering differently");
    });

    it("should format Supabase-style error objects (srs style)", () => {
      const error = {
        code: "500",
        message: "Server error",
        details: "kaboom",
        hint: "check logs",
      };
      const result = toErrorMessage(error, { style: "srs" });
      expect(result).toBe(
        "Server error | code=500 | details=kaboom | hint=check logs",
      );
    });

    it("should handle empty objects with style fallback", () => {
      expect(toErrorMessage({}, { style: "sync" })).toBe(
        "Unknown error (empty error object)",
      );
      expect(toErrorMessage({}, { style: "srs" })).toBe(
        "Unknown error (empty object)",
      );
    });

    it("should serialize other objects to JSON", () => {
      expect(toErrorMessage({ foo: "bar" })).toBe('{"foo":"bar"}');
    });

    it("should return Unknown error on serialization failure", () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;
      expect(toErrorMessage(circular)).toBe("Unknown error");
    });
  });

  describe("toSafeCursorTimestamp", () => {
    const fallback = "2024-01-01T00:00:00.000Z";
    const context = { table: "test" };

    it("should return valid candidate as ISO string", () => {
      const candidate = "2024-03-20T10:00:00Z";
      expect(toSafeCursorTimestamp(candidate, fallback, context)).toBe(
        "2024-03-20T10:00:00.000Z",
      );
    });

    it("should use fallback if candidate is invalid", () => {
      const candidate = "invalid date";
      const result = toSafeCursorTimestamp(candidate, fallback, context);
      expect(result).toBe(fallback);
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid cursor timestamp encountered, using fallback",
        expect.objectContaining({ fallback }),
      );
    });

    it("should use epoch if both candidate and fallback are invalid", () => {
      const candidate = "invalid";
      const badFallback = "also invalid";
      const result = toSafeCursorTimestamp(candidate, badFallback, context);
      expect(result).toBe("1970-01-01T00:00:00.000Z");
      expect(logger.error).toHaveBeenCalledWith(
        "Invalid cursor timestamp and fallback; defaulting to epoch",
        expect.anything(),
      );
    });

    it("should use custom log messages if provided", () => {
      const options = {
        invalidCandidateMessage: "Custom warn",
        invalidFallbackMessage: "Custom error",
      };
      toSafeCursorTimestamp("bad", fallback, context, options);
      expect(logger.warn).toHaveBeenCalledWith(
        "Custom warn",
        expect.anything(),
      );

      toSafeCursorTimestamp("bad", "bad", context, options);
      expect(logger.error).toHaveBeenCalledWith(
        "Custom error",
        expect.anything(),
      );
    });
  });
});
