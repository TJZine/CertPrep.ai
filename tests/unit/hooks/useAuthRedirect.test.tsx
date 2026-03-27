import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("useAuthRedirect", () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn(),
    } as unknown as ReturnType<typeof useSearchParams>);
  });

  it("redirects to home if session exists", async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue({
      auth: { getSession: mockGetSession },
    } as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useAuthRedirect());

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
      expect(result.current.isRedirecting).toBe(true);
    });
  });

  it("redirects to custom destination if session exists", async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue({
      auth: { getSession: mockGetSession },
    } as unknown as ReturnType<typeof createClient>);

    renderHook(() => useAuthRedirect("/dashboard"));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("does not redirect if no session exists", async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(createClient).mockReturnValue({
      auth: { getSession: mockGetSession },
    } as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useAuthRedirect());

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRedirecting).toBe(false);
    });
  });

  it("bypasses redirect if debug_auth query param is present", async () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: (key: string) => (key === "debug_auth" ? "true" : null),
    } as unknown as ReturnType<typeof useSearchParams>);

    const { result } = renderHook(() => useAuthRedirect());

    await waitFor(() => {
      expect(createClient).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("handles auth check failures gracefully", async () => {
    const mockGetSession = vi.fn().mockRejectedValue(new Error("Network Error"));
    vi.mocked(createClient).mockReturnValue({
      auth: { getSession: mockGetSession },
    } as unknown as ReturnType<typeof createClient>);

    const { result } = renderHook(() => useAuthRedirect());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
