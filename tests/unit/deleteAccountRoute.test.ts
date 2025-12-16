import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "@/app/api/auth/delete-account/route";

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
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(response.cookies.get("sb-access-token")?.value).toBe("");
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
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("rejects requests with oversized body (>1KB)", async () => {
    const request = new NextRequest(
      "https://certprep.ai/api/auth/delete-account",
      {
        method: "DELETE",
        headers: {
          origin: "https://certprep.ai",
          "sec-fetch-site": "same-origin",
          "content-length": "2048", // 2KB > 1KB limit
        },
      },
    );

    const response = await DELETE(request);

    expect(response.status).toBe(413);
    const body = await response.json();
    expect(body.error).toBe("Request body too large");
    expect(supabaseAdminClient.auth.admin.deleteUser).not.toHaveBeenCalled();
  });
});
