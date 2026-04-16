import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "@/lib/clipboard";

describe("copyToClipboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await copyToClipboard("copied text");

    expect(writeText).toHaveBeenCalledWith("copied text");
  });

  it("falls back to document.execCommand when navigator clipboard is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => true),
    });

    const execCommand = vi.spyOn(document, "execCommand");

    await copyToClipboard("fallback text");

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("falls back to document.execCommand when navigator.clipboard.writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => true),
    });

    const execCommand = vi.spyOn(document, "execCommand");

    await copyToClipboard("fallback text after rejection");

    expect(writeText).toHaveBeenCalledWith("fallback text after rejection");
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("throws when document.execCommand reports copy failure", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
    });

    await expect(copyToClipboard("copy failure")).rejects.toThrow(
      "Copy to clipboard failed",
    );
    expect(document.querySelector("textarea")).toBeNull();
  });
});
