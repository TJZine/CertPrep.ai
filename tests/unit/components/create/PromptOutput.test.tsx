import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { PromptOutput } from "@/components/create/PromptOutput";
import { copyToClipboard } from "@/lib/clipboard";

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

describe("PromptOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copyToClipboard).mockResolvedValue(undefined);
  });

  it("copies the prompt and shows temporary success feedback", async () => {
    render(<PromptOutput prompt="Generate a quiz prompt" />);

    fireEvent.click(screen.getByRole("button", { name: /copy prompt/i }));

    expect(copyToClipboard).toHaveBeenCalledWith("Generate a quiz prompt");
    expect(
      await screen.findByRole("button", { name: /copied!/i }),
    ).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1600);
      });
    });

    expect(
      screen.getByRole("button", { name: /copy prompt/i }),
    ).toBeInTheDocument();
  });
});
