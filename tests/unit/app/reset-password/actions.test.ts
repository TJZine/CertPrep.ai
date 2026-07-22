import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECOVERY_PROOF_COOKIE_NAME,
  RECOVERY_PROOF_COOKIE_PATH,
} from "@/lib/auth/recoveryProof";

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSet,
  })),
}));

import { consumeRecoveryProof } from "@/app/reset-password/actions";

describe("consumeRecoveryProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expires the scoped HttpOnly proof cookie", async () => {
    await consumeRecoveryProof();

    expect(mocks.cookieSet).toHaveBeenCalledWith(
      RECOVERY_PROOF_COOKIE_NAME,
      "",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: RECOVERY_PROOF_COOKIE_PATH,
        maxAge: 0,
      }),
    );
  });
});
