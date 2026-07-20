import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllData } from "@/lib/dataExport";
import { clearDatabase } from "@/db";
import { requestServiceWorkerCacheClear } from "@/lib/serviceWorkerClient";

vi.mock("@/db", () => ({
  clearDatabase: vi.fn(),
  db: {},
}));

vi.mock("@/lib/serviceWorkerClient", () => ({
  requestServiceWorkerCacheClear: vi.fn(),
}));

const mocks = vi.hoisted(() => ({
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}));

describe("clearAllData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clearDatabase).mockResolvedValue(undefined);
    vi.mocked(requestServiceWorkerCacheClear).mockResolvedValue({
      status: "cleared",
    });
  });

  it("uses the complete database reset and clears browser storage and caches", async () => {
    const localStorageClear = vi.spyOn(Storage.prototype, "clear");

    await clearAllData();

    expect(clearDatabase).toHaveBeenCalledTimes(1);
    expect(localStorageClear).toHaveBeenCalledTimes(2);
    expect(requestServiceWorkerCacheClear).toHaveBeenCalledTimes(1);

    localStorageClear.mockRestore();
  });

  it("completes local reset but reports an unconfirmed cache clear", async () => {
    vi.mocked(requestServiceWorkerCacheClear).mockResolvedValue({
      status: "timeout",
    });

    await clearAllData();

    expect(clearDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.loggerWarn).toHaveBeenCalledWith(
      "Factory reset could not confirm runtime cache deletion",
      { status: "timeout" },
    );
  });
});
