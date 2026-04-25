import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initSpy = vi.fn();
const getClientSpy = vi.fn();
const consoleLoggingIntegrationSpy = vi.fn(
  (options: { levels: string[] }) => ({
    name: "console-logging",
    options,
  }),
);
const replayIntegrationSpy = vi.fn(
  (options: { maskAllText: boolean; blockAllMedia: boolean }) => ({
    name: "replay",
    options,
  }),
);

vi.mock("@sentry/nextjs", () => ({
  init: initSpy,
  getClient: getClientSpy,
  consoleLoggingIntegration: consoleLoggingIntegrationSpy,
  replayIntegration: replayIntegrationSpy,
}));

const originalEnv = { ...process.env };

describe("Sentry config modules", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it("configures the server SDK with structured logging and safe defaults", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SENTRY_DSN", "https://server.example/1");

    await import("../../sentry.server.config");

    expect(consoleLoggingIntegrationSpy).toHaveBeenCalledWith({
      levels: ["log", "warn", "error"],
    });
    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://server.example/1",
        tracesSampleRate: 1,
        enableLogs: true,
        sendDefaultPii: false,
        integrations: [
          {
            name: "console-logging",
            options: { levels: ["log", "warn", "error"] },
          },
        ],
      }),
    );
  });

  it("configures the edge SDK with production-safe sampling and no PII", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://edge.example/1");

    await import("../../sentry.edge.config");

    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://edge.example/1",
        tracesSampleRate: 0.1,
        enableLogs: false,
        sendDefaultPii: false,
      }),
    );
  });

  it("initializes the client SDK only when a DSN exists and no client is active", async () => {
    const addIntegrationSpy = vi.fn();
    getClientSpy
      .mockReturnValueOnce(null)
      .mockReturnValue({ addIntegration: addIntegrationSpy });
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://client.example/1");
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(((() => 1) as unknown) as typeof setTimeout);

    await import("../../sentry.client.config");

    expect(initSpy).toHaveBeenCalledTimes(1);

    const [config] = initSpy.mock.calls[0] ?? [];
    expect(config).toEqual(
      expect.objectContaining({
        dsn: "https://client.example/1",
        integrations: [],
        tracesSampleRate: 1,
        replaysSessionSampleRate: 1,
        replaysOnErrorSampleRate: 1,
        debug: true,
      }),
    );

    expect(
      config.beforeSend({
        exception: {
          values: [{ value: "token=abc123 password: hunter2" }],
        },
        message: "auth secret=my-secret",
      }),
    ).toEqual({
      exception: {
        values: [{ value: "token=[REDACTED] password=[REDACTED]" }],
      },
      message: "auth=[REDACTED]",
    });

    expect(
      config.beforeSend({
        exception: {
          values: [
            {
              value:
                "importScripts failed inside WorkerGlobalScope while loading worker chunk",
            },
          ],
        },
      }),
    ).toBeNull();

    expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

    const handleInteraction = addEventListenerSpy.mock.calls[0]?.[1] as
      | (() => void)
      | undefined;
    expect(handleInteraction).toBeDefined();
    handleInteraction?.();
    await vi.waitFor(() => {
      expect(replayIntegrationSpy).toHaveBeenCalledWith({
        maskAllText: true,
        blockAllMedia: true,
      });
      expect(addIntegrationSpy).toHaveBeenCalledWith({
        name: "replay",
        options: { maskAllText: true, blockAllMedia: true },
      });
    });

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(4);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it("does not initialize the client SDK without a DSN", async () => {
    getClientSpy.mockReturnValue(null);
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    await import("../../sentry.client.config");

    expect(initSpy).not.toHaveBeenCalled();
  });
});
