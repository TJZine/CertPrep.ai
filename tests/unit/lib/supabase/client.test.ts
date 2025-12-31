import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createClient, SUPABASE_TIMEOUT_MS } from "@/lib/supabase/client";
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

            expect(timeoutSpy).toHaveBeenCalledWith(SUPABASE_TIMEOUT_MS);
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

        it("calls setTimeout with SUPABASE_TIMEOUT_MS in fallback path", async () => {
            const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
            vi.stubGlobal("fetch", mockFetch);
            vi.stubGlobal("AbortSignal", {}); // No timeout method

            const setTimeoutSpy = vi.spyOn(global, "setTimeout");
            const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

            const abortSpy = vi.fn();
            const MockControllerClass = class {
                signal = "controller-signal";
                abort = abortSpy;
            };
            vi.stubGlobal("AbortController", MockControllerClass);

            await capturedFetch("https://example.com", {});

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), SUPABASE_TIMEOUT_MS);
            expect(clearTimeoutSpy).toHaveBeenCalled(); // Cleanup after fetch resolves

            setTimeoutSpy.mockRestore();
            clearTimeoutSpy.mockRestore();
        });

        it("aborts when timeout fires before fetch completes", async () => {
            vi.useFakeTimers();

            try {
                const abortSpy = vi.fn();
                const MockControllerClass = class {
                    signal = "controller-signal";
                    abort = abortSpy;
                };
                vi.stubGlobal("AbortController", MockControllerClass);
                vi.stubGlobal("AbortSignal", {}); // No timeout method

                // Never-resolving fetch to simulate slow/hanging response
                const mockFetch = vi.fn().mockReturnValue(new Promise<Response>(() => { }));
                vi.stubGlobal("fetch", mockFetch);

                // Start fetch but don't await — it simulates a hanging request
                void capturedFetch("https://example.com", {});

                // Advance timers past the timeout threshold
                await vi.advanceTimersByTimeAsync(SUPABASE_TIMEOUT_MS + 1);

                // Controller.abort() should have been called when timeout fired
                expect(abortSpy).toHaveBeenCalled();
            } finally {
                vi.useRealTimers();
            }
        });
    });
});
