import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FlashcardCard } from "@/components/flashcard/FlashcardCard";
import type { Question } from "@/types/quiz";

describe("FlashcardCard", () => {
  const baseQuestion: Question = {
    id: "q-1",
    category: "Networking",
    difficulty: "Easy",
    question: "What is TCP?",
    options: {
      a: "Transmission Control Protocol",
      b: "Transfer Connection Process",
    },
    explanation: "TCP provides reliable, ordered delivery.",
    correct_answer: "a",
  };

  const renderCard = (question: Question): ReturnType<typeof render> =>
    render(
      <FlashcardCard question={question} isFlipped={false} onFlip={vi.fn()} />,
    );

  it("renders and styles supported question, answer, and explanation markup", () => {
    renderCard({
      ...baseQuestion,
      question: "What is <strong>TCP</strong>?",
      options: {
        ...baseQuestion.options,
        a: "<p><strong>Transmission Control Protocol</strong></p><ul><li>Ordered delivery</li></ul>",
      },
      explanation:
        "<p>It provides:</p><ul><li><em>Reliable</em> delivery</li></ul>",
    });

    const questionText = screen.getByText("TCP");
    expect(questionText.tagName).toBe("STRONG");
    expect(questionText.parentElement).toHaveClass(
      "prose",
      "prose-p:text-foreground",
      "prose-strong:text-foreground",
      "prose-li:marker:text-foreground",
    );

    const answerText = screen.getByText("Transmission Control Protocol");
    expect(answerText.tagName).toBe("STRONG");
    expect(answerText.closest("div")).toHaveClass(
      "prose",
      "prose-sm",
      "prose-p:text-foreground",
      "prose-code:text-foreground",
      "prose-li:marker:text-foreground",
    );
    expect(screen.getByText("Ordered delivery").closest("ul")).toBeDefined();

    expect(screen.getByText("It provides:").tagName).toBe("P");
    const emphasizedText = screen.getByText("Reliable");
    expect(emphasizedText.tagName).toBe("EM");
    expect(emphasizedText.closest("li")?.textContent).toBe("Reliable delivery");
    expect(emphasizedText.closest("div")).toHaveClass(
      "prose",
      "prose-sm",
      "text-muted-foreground",
      "prose-p:text-muted-foreground",
      "prose-strong:text-muted-foreground",
      "prose-li:marker:text-muted-foreground",
    );
  });

  it("sanitizes hostile question, answer, and explanation markup", () => {
    const globals = window as Window & {
      __flashcardQuestionXss?: number;
      __flashcardAnswerXss?: number;
      __flashcardExplanationXss?: number;
    };
    globals.__flashcardQuestionXss = 0;
    globals.__flashcardAnswerXss = 0;
    globals.__flashcardExplanationXss = 0;

    const { container } = renderCard({
      ...baseQuestion,
      question:
        'Question <strong onclick="window.__flashcardQuestionXss = 1">safe</strong><img src=x onerror="window.__flashcardQuestionXss = 2">',
      options: {
        ...baseQuestion.options,
        a: '<strong onfocus="window.__flashcardAnswerXss = 1">safe answer</strong><svg onload="window.__flashcardAnswerXss = 2"></svg>',
      },
      explanation:
        'Explanation <script>window.__flashcardExplanationXss = 1</script><span onmouseover="window.__flashcardExplanationXss = 2">safe detail</span>',
    });

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg:not(.lucide)")).toBeNull();
    expect(container.querySelector("[onclick]")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("[onfocus]")).toBeNull();
    expect(container.querySelector("[onload]")).toBeNull();
    expect(container.querySelector("[onmouseover]")).toBeNull();
    expect(screen.getByText("safe").tagName).toBe("STRONG");
    expect(screen.getByText("safe answer").tagName).toBe("STRONG");
    expect(screen.getByText("safe detail").tagName).toBe("SPAN");
    expect(globals.__flashcardQuestionXss).toBe(0);
    expect(globals.__flashcardAnswerXss).toBe(0);
    expect(globals.__flashcardExplanationXss).toBe(0);
  });

  it("continues to render plain-text content", () => {
    renderCard(baseQuestion);

    expect(screen.getByText("What is TCP?")).toBeDefined();
    expect(
      screen.getByText("TCP provides reliable, ordered delivery."),
    ).toBeDefined();
  });

  it("omits the explanation section when no explanation is provided", () => {
    renderCard({ ...baseQuestion, explanation: "" });

    expect(screen.queryByText("Explanation")).toBeNull();
    expect(screen.getByText("Correct Answer")).toBeDefined();
  });
});
