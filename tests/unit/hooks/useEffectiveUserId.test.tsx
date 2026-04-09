import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffectiveUserId } from "@/hooks/useEffectiveUserId";

describe("useEffectiveUserId", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns auth user id if provided", () => {
    const { result } = renderHook(() => useEffectiveUserId("auth-user-123"));
    expect(result.current).toBe("auth-user-123");
  });

  it("returns existing guest id from local storage if available", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("existing-guest-id");
    const { result } = renderHook(() => useEffectiveUserId(undefined));

    expect(localStorage.getItem).toHaveBeenCalledWith("cp_guest_user_id");
    expect(result.current).toBe("existing-guest-id");
  });

  it("generates and saves a new guest id if none exists", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    const mockUUID = "new-uuid-1234-5678";

    // Mock crypto.randomUUID
    Object.defineProperty(global, "crypto", {
      value: { randomUUID: () => mockUUID },
      configurable: true,
    });

    const { result } = renderHook(() => useEffectiveUserId(undefined));

    expect(localStorage.getItem).toHaveBeenCalledWith("cp_guest_user_id");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "cp_guest_user_id",
      mockUUID,
    );
    expect(result.current).toBe(mockUUID);
  });
});
