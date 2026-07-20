import * as React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const RECOVERY_USER_A = "11111111-1111-4111-8111-111111111111";
const RECOVERY_USER_B = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateUser: vi.fn(),
  consumeRecoveryProof: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  addToast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: (): { push: typeof mocks.push; refresh: typeof mocks.refresh } => ({
    push: mocks.push,
    refresh: mocks.refresh,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: (): {
    auth: {
      getSession: typeof mocks.getSession;
      updateUser: typeof mocks.updateUser;
    };
  } => ({
    auth: {
      getSession: mocks.getSession,
      updateUser: mocks.updateUser,
    },
  }),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mocks.addToast } => ({
    addToast: mocks.addToast,
  }),
}));

vi.mock("@/app/reset-password/actions", () => ({
  consumeRecoveryProof: mocks.consumeRecoveryProof,
}));

import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.consumeRecoveryProof.mockResolvedValue(undefined);
  });

  it("fails closed without server-verified recovery proof", () => {
    render(<ResetPasswordForm expectedRecoveryUserId={null} />);

    expect(
      screen.getByRole("heading", { name: /reset link unavailable/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /recovery link is invalid or has expired/i,
    );
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.queryByRole("button", { name: /update password/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("requires an active session after server proof succeeds", async () => {
    render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      /validating your recovery link/i,
    );

    await waitFor(() => {
      expect(mocks.getSession).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("heading", { name: /reset link unavailable/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /update password/i }),
    ).not.toBeInTheDocument();
  });

  it("exposes the update form only with proof and an active session", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: RECOVERY_USER_A } } },
      error: null,
    });

    render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    await waitFor(() => {
      expect(mocks.getSession).toHaveBeenCalledOnce();
      expect(
        screen.getByRole("button", { name: /update password/i }),
      ).toBeInTheDocument();
    });
  });

  it("rejects an A recovery proof after the active session changes to B", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: RECOVERY_USER_B } } },
      error: null,
    });

    render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /reset link unavailable/i }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: /update password/i }),
    ).not.toBeInTheDocument();
  });

  it("fails closed when navigation transitions from verified to bare", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: RECOVERY_USER_A } } },
      error: null,
    });
    const { rerender } = render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /update password/i }),
      ).toBeInTheDocument();
    });

    rerender(<ResetPasswordForm expectedRecoveryUserId={null} />);

    expect(
      screen.getByRole("heading", { name: /reset link unavailable/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /update password/i }),
    ).not.toBeInTheDocument();
  });

  it("consumes the server proof after a successful password update", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: RECOVERY_USER_A } } },
      error: null,
    });

    render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /update password/i }),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /update password/i }),
    );

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({
        password: "Password123",
      });
      expect(mocks.consumeRecoveryProof).toHaveBeenCalledOnce();
      expect(mocks.push).toHaveBeenCalledWith("/");
    });
  });

  it("rejects a session that changes from A to B immediately before submit", async () => {
    mocks.getSession
      .mockResolvedValueOnce({
        data: { session: { user: { id: RECOVERY_USER_A } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { session: { user: { id: RECOVERY_USER_B } } },
        error: null,
      });

    render(
      <ResetPasswordForm
        expectedRecoveryUserId={RECOVERY_USER_A}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /update password/i }),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /update password/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/recovery link is invalid/i)).toBeInTheDocument();
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.consumeRecoveryProof).not.toHaveBeenCalled();
  });
});
