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
const captureRouterTransitionStartSpy = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: initSpy,
  getClient: getClientSpy,
  consoleLoggingIntegration: consoleLoggingIntegrationSpy,
  replayIntegration: replayIntegrationSpy,
  captureRouterTransitionStart: captureRouterTransitionStartSpy,
}));

const originalEnv = { ...process.env };

describe("Sentry config modules", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();

    // Set default mock responses so each test has a known baseline before overrides.
    getClientSpy.mockReturnValue(null);
    initSpy.mockImplementation(() => {});
    captureRouterTransitionStartSpy.mockImplementation(() => void 0);
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

  it("builds the client SDK config with redaction and sampling defaults", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://client.example/1");

    const { getClientSentryConfig } = await import("../../sentry.client.config");
    const config = getClientSentryConfig();

    expect(config).toEqual(
      expect.objectContaining({
        dsn: "https://client.example/1",
        integrations: [],
        tracesSampleRate: 1,
        enableLogs: true,
        replaysSessionSampleRate: 1,
        replaysOnErrorSampleRate: 1,
        sendDefaultPii: false,
        debug: true,
      }),
    );

    expect(
      config.beforeSend?.({
        exception: {
          values: [
            {
              value:
                "token=abc123 apiKey=abc123 accessToken=abc123 secret_key=abc123 Authorization: Bearer abc123",
            },
          ],
        },
        message: "apiKey=abc123",
      } as never, {} as never),
    ).toEqual({
      exception: {
        values: [
          {
            value: "[REDACTED] [REDACTED] [REDACTED] [REDACTED] [REDACTED]",
          },
        ],
      },
      message: "[REDACTED]",
    });

    expect(
      config.beforeSend?.({
        exception: {
          values: [
            {
              value:
                "importScripts failed inside WorkerGlobalScope while loading worker chunk",
            },
          ],
        },
      } as never, {} as never),
    ).toBeNull();
  });

  it("loads replay when user interaction occurs and removes listeners", async () => {
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
      .mockReturnValue(1 as unknown as ReturnType<typeof setTimeout>);

    await import("../../src/instrumentation-client");

    expect(initSpy).toHaveBeenCalledTimes(1);

    const [config] = initSpy.mock.calls[0] ?? [];
    expect(config).toEqual(
      expect.objectContaining({
        dsn: "https://client.example/1",
        integrations: [],
        tracesSampleRate: 1,
        enableLogs: true,
        replaysSessionSampleRate: 1,
        replaysOnErrorSampleRate: 1,
        sendDefaultPii: false,
        debug: true,
      }),
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

    const handleInteraction = addEventListenerSpy.mock.calls[0]?.[1] as
      | (() => void)
      | undefined;
    expect(handleInteraction).toBeDefined();
    handleInteraction?.();
    expect(replayIntegrationSpy).toHaveBeenCalledWith({
      maskAllText: true,
      blockAllMedia: true,
    });
    expect(addIntegrationSpy).toHaveBeenCalledWith({
      name: "replay",
      options: { maskAllText: true, blockAllMedia: true },
    });
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(4);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it("loads replay on timeout fallback and removes listeners", async () => {
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
      .mockImplementation((handler) => {
        void handler;
        return 1 as unknown as ReturnType<typeof setTimeout>;
      });

    await import("../../src/instrumentation-client");

    expect(initSpy).toHaveBeenCalledTimes(1);

    const [config] = initSpy.mock.calls[0] ?? [];
    expect(config).toEqual(
      expect.objectContaining({
        dsn: "https://client.example/1",
        integrations: [],
        tracesSampleRate: 1,
        enableLogs: true,
        replaysSessionSampleRate: 1,
        replaysOnErrorSampleRate: 1,
        sendDefaultPii: false,
        debug: true,
      }),
    );

    expect(addEventListenerSpy).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

    const timeoutHandler = setTimeoutSpy.mock.calls[0]?.[0];
    expect(timeoutHandler).toBeDefined();
    if (typeof timeoutHandler === "function") {
      timeoutHandler();
    }

    expect(replayIntegrationSpy).toHaveBeenCalledWith({
      maskAllText: true,
      blockAllMedia: true,
    });
    expect(addIntegrationSpy).toHaveBeenCalledWith({
      name: "replay",
      options: { maskAllText: true, blockAllMedia: true },
    });
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(4);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it("disables client logs in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://client.example/1");

    const { getClientSentryConfig } = await import("../../sentry.client.config");
    const config = getClientSentryConfig();

    expect(config.enableLogs).toBe(false);
  });

  it("does not initialize the client SDK without a DSN", async () => {
    getClientSpy.mockReturnValue(null);
    vi.unstubAllEnvs();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    await import("../../src/instrumentation-client");

    expect(initSpy).not.toHaveBeenCalled();
  });
});
