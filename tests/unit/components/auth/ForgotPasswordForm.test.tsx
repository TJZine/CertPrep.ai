import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY = "test-key";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): {
    auth: { resetPasswordForEmail: typeof mocks.resetPasswordForEmail };
  } => ({
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mocks.addToast } => ({
    addToast: mocks.addToast,
  }),
}));

vi.mock("@hcaptcha/react-hcaptcha", () => {
  const React = require("react");
  const Mock = React.forwardRef(function HCaptchaMock(
    props: { onVerify: (token: string) => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      resetCaptcha: vi.fn(),
    }));
    return (
      <button
        type="button"
        data-testid="mock-hcaptcha"
        onClick={() => props.onVerify("captcha-token")}
      >
        Complete captcha
      </button>
    );
  });
  return { default: Mock };
});

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it("sends recovery links through the callback with a non-secret recovery marker", async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByTestId("mock-hcaptcha"));
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            "/reset-password",
          )}`,
          captchaToken: "captcha-token",
        },
      );
    });
  });
});
