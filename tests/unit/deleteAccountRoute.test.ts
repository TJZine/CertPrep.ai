import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/auth/delete-account/route";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_DELETION_SERVER_TIMEOUT_MS } from "@/lib/accountDeletionTimeouts";
import { logger } from "@/lib/logger";

type CookieRecord = {
  name: string;
  value: string;
  domain?: string;
  expires?: Date | number | string;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
};

const cookieJar: CookieRecord[] = [];

const supabaseAuth = {
  getUser: vi.fn(),
  signOut: vi.fn(),
};

const supabaseClient = {
  auth: supabaseAuth,
};

const supabaseAdminClient = {
  auth: {
    admin: {
      deleteUser: vi.fn(),
    },
  },
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((): typeof supabaseClient => supabaseClient),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((): typeof supabaseAdminClient => supabaseAdminClient),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    getAll: (): CookieRecord[] => cookieJar,
    set: (
      name: string,
      value: string,
      options?: Partial<CookieRecord>,
    ): void => {
      cookieJar.push({ name, value, ...options });
    },
    get: (name: string): CookieRecord | undefined =>
      cookieJar.find((c) => c.name === name),
  })),
}));

describe("DELETE /api/auth/delete-account", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    cookieJar.length = 0;
    process.env.NEXT_PUBLIC_SITE_URL = "https://certprep.ai";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    supabaseAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    supabaseAuth.signOut.mockImplementation(async () => {
      cookieJar.push({
        name: "sb-access-token",
        value: "",
        maxAge: 0,
        path: "/",
      });
      return { error: null };
    });
    supabaseAdminClient.auth.admin.deleteUser.mockResolvedValue({
      error: null,
    });
  });

  it("deletes the user and clears auth cookies", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(supabaseAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      "user-1",
    );
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.cookies.get("sb-access-token")?.value).toBe("");
  });

  it("uses one bounded fetch implementation for session and admin calls", async () => {
    const timeoutSignal = new AbortController().signal;
    const timeoutSpy = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(timeoutSignal);
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(timeoutSpy).toHaveBeenCalledWith(ACCOUNT_DELETION_SERVER_TIMEOUT_MS);

    const serverOptions = vi.mocked(createServerClient).mock.calls[0]?.[2] as
      { global?: { fetch?: typeof fetch } } | undefined;
    const adminOptions = vi.mocked(createClient).mock.calls[0]?.[2] as
      { global?: { fetch?: typeof fetch } } | undefined;

    expect(serverOptions?.global?.fetch).toBeTypeOf("function");
    expect(adminOptions?.global?.fetch).toBe(serverOptions?.global?.fetch);
  });

  it("returns an explicit timeout response when deletion cannot be confirmed", async () => {
    const timeoutController = new AbortController();
    timeoutController.abort(new DOMException("Timed out", "TimeoutError"));
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutController.signal);
    supabaseAuth.getUser.mockRejectedValueOnce(
      new DOMException("Timed out", "TimeoutError"),
    );
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error:
        "Account deletion could not be confirmed before the server deadline.",
    });
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns unauthorized when no user is found", async () => {
    supabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(401);
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("rejects requests from disallowed origins", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://malicious.test",
          "sec-fetch-site": "cross-site",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(403);
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("fails when required env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 when admin deletion fails", async () => {
    supabaseAdminClient.auth.admin.deleteUser.mockResolvedValueOnce({
      error: new Error("delete failed"),
    });

    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(500);
    expect(supabaseAuth.signOut).not.toHaveBeenCalled();
  });

  it("returns success after deletion even when local sign-out cleanup fails", async () => {
    const signOutError = new Error("sign out failed");
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    supabaseAuth.signOut.mockResolvedValueOnce({
      error: signOutError,
    });

    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(supabaseAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      "user-1",
    );
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(warnSpy).toHaveBeenCalledWith(
      "Account deleted but local sign-out cleanup failed",
      signOutError,
    );
  });

  it("returns success when sign-out throws after confirmed deletion", async () => {
    const timeoutError = new DOMException("Timed out", "TimeoutError");
    const timeoutController = new AbortController();
    timeoutController.abort(timeoutError);
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutController.signal);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    supabaseAuth.signOut.mockRejectedValueOnce(timeoutError);

    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(supabaseAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(
      "user-1",
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Account deleted but local sign-out cleanup failed",
      timeoutError,
    );
  });

  it("rejects requests with any body content", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
          "content-length": "1", // Any body content rejects
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toBe("Request body not allowed");
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });

  it("allows requests with content-length: 0", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
          "content-length": "0",
        },
      },
    );

    const response = await DELETE(request);

    // Should proceed to auth check (200 success with mock)
    expect(response.status).toBe(200);
  });

  it("allows requests without content-length header", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
        },
      },
    );

    const response = await DELETE(request);

    // Should proceed to auth check (200 success with mock)
    expect(response.status).toBe(200);
  });

  it("rejects requests with invalid content-length header", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
          "content-length": "invalid",
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toBe("Request body not allowed");
  });
});
