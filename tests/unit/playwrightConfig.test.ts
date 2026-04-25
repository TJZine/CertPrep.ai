import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const defineConfigSpy = vi.fn(<T>(config: T) => config);

vi.mock("@playwright/test", () => ({
  defineConfig: defineConfigSpy,
  devices: {
    "Desktop Chrome": {
      browserName: "chromium",
      viewport: { width: 1280, height: 720 },
    },
  },
}));

const originalEnv = { ...process.env };

describe("playwright.config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses local defaults outside CI", async () => {
    delete process.env.CI;

    const { default: config } = await import("../../playwright.config");
    const projects = config.projects ?? [];
    const webServer = Array.isArray(config.webServer)
      ? config.webServer[0]
      : config.webServer;

    expect(defineConfigSpy).toHaveBeenCalledTimes(1);
    expect(config.testDir).toBe("./tests/e2e");
    expect(config.fullyParallel).toBe(true);
    expect(config.forbidOnly).toBe(false);
    expect(config.retries).toBe(1);
    expect(config.workers).toBeUndefined();
    expect(config.reporter).toBe("html");
    expect(config.use?.storageState).toBe("tests/e2e/.auth/user.json");
    expect(projects).toHaveLength(2);
    expect(projects[0]).toEqual(
      expect.objectContaining({
        name: "chromium-auth",
        use: expect.objectContaining({
          launchOptions: expect.objectContaining({
            args: ["--disable-web-security"],
          }),
        }),
      }),
    );
    expect(projects[1]).toEqual(
      expect.objectContaining({
        name: "chromium-no-auth",
        use: expect.objectContaining({
          launchOptions: expect.objectContaining({
            args: ["--disable-web-security"],
          }),
          storageState: undefined,
        }),
      }),
    );
    expect(webServer?.command).toBe("npm run dev");
    expect(webServer?.reuseExistingServer).toBe(true);
    expect(webServer?.url).toBe("http://localhost:3000");
    expect(config.globalSetup).toBe("./tests/e2e/global-setup.ts");
  });

  it("tightens retries and workers on CI", async () => {
    process.env.CI = "true";

    const { default: config } = await import("../../playwright.config");
    const webServer = Array.isArray(config.webServer)
      ? config.webServer[0]
      : config.webServer;

    expect(config.forbidOnly).toBe(true);
    expect(config.retries).toBe(2);
    expect(config.workers).toBe(1);
    expect(config.reporter).toBe("github");
    expect(webServer?.reuseExistingServer).toBe(false);
  });
});
