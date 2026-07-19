import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataManagement } from "@/components/settings/DataManagement";

const mocks = vi.hoisted(() => ({
  addToast: vi.fn(),
  clearAllData: vi.fn(),
  getStorageStats: vi.fn(),
  getDeletedItemsStats: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mocks.addToast } => ({
    addToast: mocks.addToast,
  }),
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: (): { user: { id: string } } => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useEffectiveUserId", () => ({
  useEffectiveUserId: (): string => "user-1",
}));

vi.mock("@/lib/dataExport", () => ({
  downloadDataAsFile: vi.fn(),
  importData: vi.fn(),
  validateImportData: vi.fn(),
  clearAllData: mocks.clearAllData,
  getStorageStats: mocks.getStorageStats,
  getDeletedItemsStats: mocks.getDeletedItemsStats,
  purgeDeletedItems: vi.fn(),
}));

describe("DataManagement account deletion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStorageStats.mockResolvedValue({
      quizCount: 1,
      resultCount: 1,
      estimatedSizeKB: 1,
    });
    mocks.getDeletedItemsStats.mockResolvedValue({
      deletedQuizCount: 0,
      deletedResultCount: 0,
    });
    mocks.clearAllData.mockResolvedValue(undefined);
  });

  it.each([401, 500])(
    "preserves local data when remote deletion returns %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: "remote deletion failed" }), {
            status,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      );
      const user = userEvent.setup();

      render(<DataManagement />);

      await user.click(screen.getByRole("button", { name: "Reset" }));
      await user.type(screen.getByLabelText(/Type DELETE to confirm/i), "DELETE");
      await user.click(
        screen.getByRole("button", { name: "Delete Account + Local" }),
      );

      await waitFor(() => {
        expect(mocks.addToast).toHaveBeenCalledWith(
          "error",
          expect.stringContaining("Your local data was preserved."),
        );
      });
      expect(mocks.clearAllData).not.toHaveBeenCalled();
      expect(
        screen.getByRole("dialog", { name: "Reset Data" }),
      ).toBeInTheDocument();
    },
  );

  it("preserves local data when the remote request cannot be confirmed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const user = userEvent.setup();

    render(<DataManagement />);

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await user.type(screen.getByLabelText(/Type DELETE to confirm/i), "DELETE");
    await user.click(
      screen.getByRole("button", { name: "Delete Account + Local" }),
    );

    await waitFor(() => {
      expect(mocks.addToast).toHaveBeenCalledWith(
        "error",
        "Account deletion could not be completed. Your local data was preserved.",
      );
    });
    expect(mocks.clearAllData).not.toHaveBeenCalled();
  });
});
