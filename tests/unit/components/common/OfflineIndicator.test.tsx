import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfflineIndicator } from "@/components/common/OfflineIndicator";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

const mockUseOnlineStatus = vi.mocked(useOnlineStatus);

describe("OfflineIndicator", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders offline banner and allows dismissing", async () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false, wasOffline: false });

    const user = userEvent.setup();
    render(<OfflineIndicator />);

    expect(await screen.findByText("You're Offline")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("shows a brief reconnected banner after going back online", async () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true, wasOffline: true });

    render(<OfflineIndicator />);

    expect(await screen.findByText("Back Online")).toBeInTheDocument();

    await new Promise((resolve) => {
      window.setTimeout(resolve, 3100);
    });

    await waitFor(() => {
      expect(screen.queryByText("Back Online")).not.toBeInTheDocument();
    });
  });
});
