import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseRecoveryProof,
  RECOVERY_PROOF_COOKIE_NAME,
  RECOVERY_PROOF_MAX_AGE_SECONDS,
} from "@/lib/auth/recoveryProof";

const RECOVERY_USER_ID = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

import { GET } from "@/app/auth/callback/route";

describe("auth callback recovery provenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets matching nonce proof only after a verified recovery exchange", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: RECOVERY_USER_ID },
        redirectType: "recovery",
      },
      error: null,
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=verified&next=%2Freset-password",
      ),
    );

    const location = new URL(
      response.headers.get("location") ?? "http://invalid",
    );
    const nonce = location.searchParams.get("recovery");
    const proofCookie = response.cookies.get(
      RECOVERY_PROOF_COOKIE_NAME,
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(location.pathname).toBe("/reset-password");
    expect(nonce).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(parseRecoveryProof(proofCookie?.value)).toEqual({
      nonce,
      userId: RECOVERY_USER_ID,
    });
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toContain("Path=/reset-password");
    expect(setCookie).toContain(
      `Max-Age=${RECOVERY_PROOF_MAX_AGE_SECONDS}`,
    );
    expect(setCookie).not.toContain("Secure");
  });

  it("strips a caller-supplied marker from non-recovery exchanges", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: RECOVERY_USER_ID },
        redirectType: "signup",
      },
      error: null,
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=other&next=%2Freset-password%3Frecovery%3D1",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password",
    );
    expect(response.headers.get("location")).not.toContain("recovery=");
    expect(
      response.cookies.get(RECOVERY_PROOF_COOKIE_NAME),
    ).toBeUndefined();
  });

  it("treats a missing redirect type as non-recovery", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: RECOVERY_USER_ID },
      },
      error: null,
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=other&next=%2Freset-password%3Frecovery%3D1",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/reset-password",
    );
    expect(
      response.cookies.get(RECOVERY_PROOF_COOKIE_NAME),
    ).toBeUndefined();
  });

  it("does not add a reset marker when recovery redirects elsewhere", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: RECOVERY_USER_ID },
        redirectType: "recovery",
      },
      error: null,
    });

    const response = await GET(
      new Request(
        "http://localhost:3000/auth/callback?code=verified&next=%2F",
      ),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(
      response.cookies.get(RECOVERY_PROOF_COOKIE_NAME),
    ).toBeUndefined();
  });

  it("marks recovery proof cookies secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mocks.exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "token" },
        user: { id: RECOVERY_USER_ID },
        redirectType: "recovery",
      },
      error: null,
    });

    const response = await GET(
      new Request(
        "https://certprep.example/auth/callback?code=verified&next=%2Freset-password",
      ),
    );

    expect(response.headers.get("set-cookie")).toContain("Secure");
  });
});
