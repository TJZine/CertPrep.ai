import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InterleavedSessionPage from "@/app/interleaved/session/page";

vi.mock("next/navigation", () => ({
  useRouter: (): { push: ReturnType<typeof vi.fn> } => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): { user: { id: string } } => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: (): string => "user-1",
}));

vi.mock("@/lib/storage/interleavedStorage", () => ({
  loadInterleavedState: (): null => null,
  clearInterleavedState: vi.fn(),
}));

describe("InterleavedSessionPage", () => {
  it("uses the missing-session message as the page heading", () => {
    render(<InterleavedSessionPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "No active interleaved session found.",
      }),
    ).toBeInTheDocument();
  });
});
