import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

// Mock logger
vi.mock("@/lib/logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe("Supabase Client", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.unstubAllGlobals();
    });

    describe("createClient", () => {
        it("returns undefined and logs error if env vars are missing", () => {
            delete process.env.NEXT_PUBLIC_SUPABASE_URL;
            const client = createClient();
            expect(client).toBeUndefined();
            expect(logger.error).toHaveBeenCalledWith("Missing Supabase environment variables.");
        });

        it("creates a client successfully when env vars exist", () => {
            const client = createClient();
            expect(client).toBeDefined();
        });
    });

    describe("fetchWithTimeout logic", () => {
        let capturedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

        beforeEach(async () => {
            // Mock createBrowserClient to capture the options passed to it
            vi.doMock("@supabase/ssr", () => ({
                createBrowserClient: (
                    _url: string,
                    _key: string,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    options: any
                ): unknown => {
                    capturedFetch = options.global.fetch;
                    // Return valid shape for client to avoid spread errors if client uses it
                    return { auth: {}, from: () => ({}) };
                }
            }));

            const mod = await import("@/lib/supabase/client");
            mod.createClient();
        });

        it("uses AbortSignal.timeout when available", async () => {
            const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
            vi.stubGlobal("fetch", mockFetch);

            const mockTimeoutSignal = { aborted: false } as AbortSignal;
            const timeoutSpy = vi.fn().mockReturnValue(mockTimeoutSignal);
            // Ensure timeout exists
            vi.stubGlobal("AbortSignal", { timeout: timeoutSpy });

            await capturedFetch("https://example.com", { method: "GET" });

            expect(timeoutSpy).toHaveBeenCalledWith(30000);
            expect(mockFetch).toHaveBeenCalledWith(
                "https://example.com",
                expect.objectContaining({ signal: mockTimeoutSignal })
            );
        });

        it("falls back to AbortController/setTimeout when AbortSignal.timeout is missing", async () => {
            const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
            vi.stubGlobal("fetch", mockFetch);

            // Remove AbortSignal.timeout
            vi.stubGlobal("AbortSignal", {});

            const abortSpy = vi.fn();
            // Use a factory that returns an object, which 'new' logic can handle
            const MockControllerClass = class {
                signal = "controller-signal";
                abort = abortSpy;
            };

            vi.stubGlobal("AbortController", MockControllerClass);

            await capturedFetch("https://example.com", { method: "GET" });

            expect(abortSpy).not.toHaveBeenCalled(); // Timeout hasn't fired yet
            expect(mockFetch).toHaveBeenCalledWith(
                "https://example.com",
                expect.objectContaining({ signal: "controller-signal" })
            );
        });
    });
});
