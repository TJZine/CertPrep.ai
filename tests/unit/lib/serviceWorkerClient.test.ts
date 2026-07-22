import { afterEach, describe, expect, it, vi } from "vitest";
import { requestServiceWorkerCacheClear } from "@/lib/serviceWorkerClient";

const mocks = vi.hoisted(() => ({
  loggerWarn: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: mocks.loggerWarn,
  },
}));

class MockPort {
  peer: MockPort | null = null;
  closed = false;
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onmessageerror: (() => void) | null = null;

  postMessage(data: unknown): void {
    queueMicrotask(() => {
      if (!this.closed && !this.peer?.closed) {
        this.peer?.onmessage?.({ data } as MessageEvent<unknown>);
      }
    });
  }

  close(): void {
    this.closed = true;
  }
}

class MockMessageChannel {
  port1 = new MockPort();
  port2 = new MockPort();

  constructor() {
    this.port1.peer = this.port2;
    this.port2.peer = this.port1;
  }
}

function createWorker(acknowledgement?: {
  ok: boolean;
}): ServiceWorker & { postMessage: ReturnType<typeof vi.fn> } {
  const postMessage = vi.fn(
    (_message: unknown, transfer?: Transferable[]): void => {
      if (acknowledgement) {
        (transfer?.[0] as unknown as MockPort | undefined)?.postMessage(
          acknowledgement,
        );
      }
    },
  );
  return { postMessage } as unknown as ServiceWorker & {
    postMessage: ReturnType<typeof vi.fn>;
  };
}

function installServiceWorkerContainer({
  controller,
  active = null,
}: {
  controller: ServiceWorker | null;
  active?: ServiceWorker | null;
}): void {
  vi.stubGlobal("navigator", {
    serviceWorker: {
      controller,
      ready: Promise.resolve({ active }),
    },
  });
  vi.stubGlobal("MessageChannel", MockMessageChannel);
}

describe("requestServiceWorkerCacheClear", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns unsupported when service workers are unavailable", async () => {
    vi.stubGlobal("navigator", {});

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "unsupported",
    });
  });

  it("resolves after the controlling worker acknowledges deletion", async () => {
    const worker = createWorker({ ok: true });
    installServiceWorkerContainer({ controller: worker });

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "cleared",
    });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    expect(worker.postMessage).toHaveBeenCalledWith({ type: "CLEAR_CACHES" }, [
      expect.any(MockPort),
    ]);
  });

  it("uses the ready registration when the page has no controller", async () => {
    const worker = createWorker({ ok: true });
    installServiceWorkerContainer({ controller: null, active: worker });

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "cleared",
    });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it("does not consult ready or send twice when a controller exists", async () => {
    const worker = createWorker({ ok: true });
    vi.stubGlobal("navigator", {
      serviceWorker: {
        controller: worker,
        get ready(): never {
          throw new Error("ready should not be read");
        },
      },
    });
    vi.stubGlobal("MessageChannel", MockMessageChannel);

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "cleared",
    });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
  });

  it("reports worker-declared failure", async () => {
    const worker = createWorker({ ok: false });
    installServiceWorkerContainer({ controller: worker });

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "failed",
    });
  });

  it("reports no active worker after registration readiness", async () => {
    installServiceWorkerContainer({ controller: null });

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "no-active-worker",
    });
  });

  it("times out when an active worker does not acknowledge", async () => {
    vi.useFakeTimers();
    const worker = createWorker();
    installServiceWorkerContainer({ controller: worker });

    const resultPromise = requestServiceWorkerCacheClear();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).resolves.toEqual({ status: "timeout" });
  });

  it("bounds waiting for service worker readiness", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      serviceWorker: {
        controller: null,
        ready: new Promise(() => undefined),
      },
    });
    vi.stubGlobal("MessageChannel", MockMessageChannel);

    const resultPromise = requestServiceWorkerCacheClear();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(resultPromise).resolves.toEqual({ status: "timeout" });
  });

  it("contains postMessage failures", async () => {
    const worker = createWorker();
    worker.postMessage.mockImplementation(() => {
      throw new Error("postMessage unavailable");
    });
    installServiceWorkerContainer({ controller: worker });

    await expect(requestServiceWorkerCacheClear()).resolves.toEqual({
      status: "failed",
    });
    expect(mocks.loggerWarn).toHaveBeenCalledOnce();
  });
});
