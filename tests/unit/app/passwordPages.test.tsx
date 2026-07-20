import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RECOVERY_PROOF_COOKIE_NAME,
  serializeRecoveryProof,
} from "@/lib/auth/recoveryProof";

const RECOVERY_NONCE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_NONCE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RECOVERY_USER_ID = "11111111-1111-4111-8111-111111111111";
const RECOVERY_COOKIE = serializeRecoveryProof({
  nonce: RECOVERY_NONCE,
  userId: RECOVERY_USER_ID,
});

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookieGet,
  })),
}));

vi.mock("@/components/auth/ForgotPasswordForm", () => ({
  default: (): React.JSX.Element => <form aria-label="Forgot password" />,
}));

vi.mock("@/components/auth/ResetPasswordForm", () => ({
  default: ({
    expectedRecoveryUserId,
  }: {
    expectedRecoveryUserId: string | null;
  }): React.JSX.Element => (
    <form
      aria-label="Reset password"
      data-recovery-user={expectedRecoveryUserId ?? ""}
    />
  ),
}));

import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";

describe("password page wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue(undefined);
  });

  it("keeps the forgot password page within the layout viewport", () => {
    const { container } = render(<ForgotPasswordPage />);
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass("w-full");
    expect(wrapper).not.toHaveClass("w-screen");
  });

  it("keeps the reset password page within the layout viewport", async () => {
    const page = await ResetPasswordPage({
      searchParams: Promise.resolve({}),
    });
    const { container } = render(page);
    const wrapper = container.firstElementChild;

    expect(wrapper).toHaveClass("w-full");
    expect(wrapper).not.toHaveClass("w-screen");
  });

  it("passes verified proof only when query nonce matches the HttpOnly cookie", async () => {
    mocks.cookieGet.mockImplementation((name: string) =>
      name === RECOVERY_PROOF_COOKIE_NAME
        ? { name, value: RECOVERY_COOKIE }
        : undefined,
    );

    render(
      await ResetPasswordPage({
        searchParams: Promise.resolve({ recovery: RECOVERY_NONCE }),
      }),
    );

    expect(screen.getByLabelText("Reset password")).toHaveAttribute(
      "data-recovery-user",
      RECOVERY_USER_ID,
    );
  });

  it.each([
    ["missing query nonce", {}, RECOVERY_COOKIE],
    ["missing proof cookie", { recovery: RECOVERY_NONCE }, undefined],
    ["mismatched proof", { recovery: OTHER_NONCE }, RECOVERY_COOKIE],
    [
      "ambiguous query nonce",
      { recovery: [RECOVERY_NONCE] },
      RECOVERY_COOKIE,
    ],
    ["malformed proof cookie", { recovery: RECOVERY_NONCE }, "forged"],
  ])(
    "fails closed for %s",
    async (_name, searchParams, cookieValue) => {
      mocks.cookieGet.mockReturnValue(
        cookieValue
          ? {
              name: RECOVERY_PROOF_COOKIE_NAME,
              value: cookieValue,
            }
          : undefined,
      );

      render(
        await ResetPasswordPage({
          searchParams: Promise.resolve(searchParams),
        }),
      );

      expect(screen.getByLabelText("Reset password")).toHaveAttribute(
        "data-recovery-user",
        "",
      );
    },
  );
});
