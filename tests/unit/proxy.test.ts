import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import proxy from "@/proxy";

const supabaseAuth = {
  getUser: vi.fn(),
};

const supabaseClient = {
  auth: supabaseAuth,
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((): typeof supabaseClient => supabaseClient),
}));

vi.mock("@/lib/security", () => ({
  buildCSPHeader: vi.fn(() => "default-src 'self'"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    supabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  it("redirects unauthenticated users away from protected routes", async () => {
    const request = new NextRequest("https://certprep.ai/settings?tab=security", {
      headers: {
        accept: "text/html",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://certprep.ai/login?next=%2Fsettings%3Ftab%3Dsecurity",
    );
  });

  it("passes through authenticated auth-route requests and preserves response headers", async () => {
    supabaseAuth.getUser.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const request = new NextRequest("https://certprep.ai/login", {
      headers: {
        accept: "text/html",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'",
    );
    expect(response.headers.get("x-nonce")).toBeTruthy();
  });

  it("passes through public auth pages for unauthenticated users and sets no-cache headers", async () => {
    const request = new NextRequest("https://certprep.ai/login", {
      headers: {
        accept: "text/html",
      },
    });

    const response = await proxy(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, no-cache, no-store, max-age=0, must-revalidate",
    );
    expect(response.headers.get("Content-Security-Policy")).toBe(
      "default-src 'self'",
    );
    expect(response.headers.get("x-nonce")).toBeTruthy();
  });
});
