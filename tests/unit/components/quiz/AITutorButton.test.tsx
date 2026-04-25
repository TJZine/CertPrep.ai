import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AITutorButton } from "@/components/quiz/AITutorButton";
import { copyToClipboard } from "@/lib/clipboard";

const mockAddToast = vi.fn();

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: vi.fn(),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: (): { addToast: typeof mockAddToast } => ({
    addToast: mockAddToast,
  }),
}));

vi.mock("@/hooks/useCorrectAnswer", () => ({
  useCorrectAnswer: (): { resolvedAnswers: Record<string, string> } => ({
    resolvedAnswers: { "question-1": "B" },
  }),
}));

describe("AITutorButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(copyToClipboard).mockResolvedValue(undefined);
  });

  it("copies the generated AI tutor prompt through the shared clipboard utility", async () => {
    render(
      <AITutorButton
        question={{
          id: "question-1",
          category: "Networking",
          question: "What does DNS stand for?",
          options: {
            A: "Dynamic Name Service",
            B: "Domain Name System",
          },
          correct_answer: "B",
          correct_answer_hash: "hash",
          explanation: "DNS maps names to IP addresses.",
        }}
        userAnswer="A"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy ai prompt/i }));

    await waitFor(() => {
      expect(copyToClipboard).toHaveBeenCalledTimes(1);
      expect(mockAddToast).toHaveBeenCalledWith(
        "success",
        "Prompt copied! Paste it into your favorite AI assistant.",
      );
    });

    expect(vi.mocked(copyToClipboard).mock.calls[0]?.[0]).toContain(
      "What does DNS stand for?",
    );
    expect(
      await screen.findByRole("button", { name: /copied!/i }),
    ).toBeInTheDocument();
  });
});
