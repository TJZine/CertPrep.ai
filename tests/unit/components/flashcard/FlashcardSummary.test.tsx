import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FlashcardSummary } from "@/components/flashcard/FlashcardSummary";

vi.mock("next/navigation", () => ({
  useRouter: (): { push: ReturnType<typeof vi.fn> } => ({
    push: vi.fn(),
  }),
}));

describe("FlashcardSummary", () => {
  it("uses the completion title as the page heading", () => {
    render(
      <FlashcardSummary
        ratings={{ "question-1": 3 }}
        totalCards={1}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Session Complete" }),
    ).toBeInTheDocument();
  });
});
