"use client";

import * as React from "react";
import { Bot, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useCorrectAnswer } from "@/hooks/useCorrectAnswer";
import type { Question } from "@/types/quiz";

interface AITutorButtonProps {
  question: Question;
  userAnswer: string;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Copies a rich AI tutor prompt to clipboard for external LLMs.
 */
export function AITutorButton({
  question,
  userAnswer,
  className,
  variant = "default",
}: AITutorButtonProps): React.ReactNode {
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useToast();

  const { resolvedAnswers } = useCorrectAnswer(
    question.id,
    question.correct_answer_hash || null,
    question.options,
  );

  const correctAnswerKey =
    resolvedAnswers[question.id] || question.correct_answer;

  const generatePrompt = React.useCallback((): string => {
    const correctKey = correctAnswerKey || "";
    const correctText = question.options[correctKey] ?? correctKey;

    if (question.ai_prompt) {
      return question.ai_prompt
        .replace("{question}", question.question)
        .replace("{user_answer}", question.options[userAnswer] ?? userAnswer)
        .replace("{correct_answer}", correctText)
        .replace("{category}", question.category);
    }

    const userAnswerText = question.options[userAnswer] ?? userAnswer;

    return `I'm studying for a certification exam and got this question wrong. Please help me understand why my answer was incorrect and explain the correct concept.

**Category:** ${question.category}

**Question:**
${question.question}

**My Answer:** ${userAnswer}) ${userAnswerText}

**Correct Answer:** ${correctKey}) ${correctText}

**The explanation provided was:**
${question.explanation}

Please:
1. Explain why my answer was wrong
2. Explain why the correct answer is right
3. Give me a simple way to remember this concept
4. If relevant, provide a real-world example`;
  }, [question, userAnswer, correctAnswerKey]);

  if (!correctAnswerKey) return null;

  const handleCopyPrompt = async (): Promise<void> => {
    const prompt = generatePrompt();

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      addToast(
        "success",
        "Prompt copied! Paste it into your favorite AI assistant.",
      );
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = prompt;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand("copy");
        setCopied(true);
        addToast("success", "Prompt copied!");
        window.setTimeout(() => setCopied(false), 3000);
      } catch {
        addToast("error", "Failed to copy prompt. Please try again.");
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  if (variant === "compact") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyPrompt}
        className={cn("gap-2", className)}
        aria-label="Copy AI tutor prompt to clipboard"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            Copied!
          </>
        ) : (
          <>
            <Bot className="h-4 w-4" aria-hidden="true" />
            Ask AI
          </>
        )}
      </Button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-info/30 bg-info/10 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20">
          <Bot
            className="h-5 w-5 text-info"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-info">
            Need more help?
          </h4>
          <p className="mt-1 text-sm text-info/80">
            Copy a detailed prompt to use with ChatGPT, Claude, or your favorite
            AI assistant for a personalized explanation.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleCopyPrompt}
              leftIcon={
                copied ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )
              }
            >
              {copied ? "Copied!" : "Copy AI Prompt"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  "https://chat.openai.com",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              rightIcon={
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              }
            >
              Open ChatGPT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AITutorButton;
