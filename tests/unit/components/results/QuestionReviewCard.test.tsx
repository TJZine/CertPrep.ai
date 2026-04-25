import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionReviewCard } from "@/components/results/QuestionReviewCard";
import type { Question } from "@/types/quiz";

vi.mock("@/components/quiz/AITutorButton", () => ({
  AITutorButton: (): React.ReactElement => <div data-testid="ai-tutor-button" />,
}));

describe("QuestionReviewCard", () => {
  const maliciousQuestion: Question = {
    id: "q-1",
    category: "Security",
    difficulty: "Easy",
    question:
      'Question <strong>safe</strong> <img src=x onerror="window.__questionXss = true">',
    options: {
      a: '<span onclick="window.__optionXss = true">Option A</span>',
      b: '<a href="javascript:window.__optionHrefXss = true">Option B</a>',
    },
    explanation:
      'Explanation <script>window.__explanationXss = true</script> <span onmouseover="window.__explanationHandlerXss = true">safe</span>',
    correct_answer: "a",
  };

  it("sanitizes hostile HTML before rendering it into the review card", () => {
    const globals = window as Window & {
      __questionXss?: number;
      __optionXss?: number;
      __optionHrefXss?: number;
      __explanationXss?: number;
      __explanationHandlerXss?: number;
    };
    globals.__questionXss = 0;
    globals.__optionXss = 0;
    globals.__optionHrefXss = 0;
    globals.__explanationXss = 0;
    globals.__explanationHandlerXss = 0;

    const { container } = render(
      <QuestionReviewCard
        question={maliciousQuestion}
        questionNumber={1}
        isFlagged={false}
        defaultExpanded={true}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onclick]")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("[onmouseover]")).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();

    expect(screen.getAllByText("safe").length).toBeGreaterThan(0);
    expect(screen.getByText("Option A")).toBeDefined();
    expect(screen.getByText("Option B")).toBeDefined();
    expect(screen.getAllByText("Explanation").length).toBeGreaterThan(0);
    expect(globals.__questionXss).toBe(0);
    expect(globals.__optionXss).toBe(0);
    expect(globals.__optionHrefXss).toBe(0);
    expect(globals.__explanationXss).toBe(0);
    expect(globals.__explanationHandlerXss).toBe(0);
  });

  it("sanitizes the collapsed preview path as well", () => {
    const longUnsafeQuestion =
      `${"<span>safe text </span>".repeat(20)}<img src=x onerror="window.__previewXss = true">`;
    const globals = window as Window & { __previewXss?: number };
    globals.__previewXss = 0;

    const { container } = render(
      <QuestionReviewCard
        question={{ ...maliciousQuestion, question: longUnsafeQuestion }}
        questionNumber={2}
        isFlagged={false}
        defaultExpanded={false}
      />,
    );

    expect(container.querySelector("[onerror]")).toBeNull();
    expect(screen.getAllByText(/safe text/i).length).toBeGreaterThan(0);
    expect(globals.__previewXss).toBe(0);
  });

  it("strips attacker-controlled classes from rendered review HTML", () => {
    render(
      <QuestionReviewCard
        question={{
          ...maliciousQuestion,
          question:
            'Question <span class="fixed inset-0 z-50 bg-black text-white">prompt</span>',
          options: {
            a: '<span class="absolute left-0 top-0 opacity-0">Option A</span>',
            b: '<span class="sr-only pointer-events-none">Option B</span>',
          },
          explanation:
            'Explanation <span class="contents [&_*]:hidden">detail</span>',
        }}
        questionNumber={3}
        isFlagged={false}
        defaultExpanded={true}
      />,
    );

    for (const element of screen.getAllByText("prompt")) {
      expect(element).not.toHaveAttribute("class");
    }
    expect(screen.getByText("Option A")).not.toHaveAttribute("class");
    expect(screen.getByText("Option B")).not.toHaveAttribute("class");
    expect(screen.getByText("detail")).not.toHaveAttribute("class");
  });
});
