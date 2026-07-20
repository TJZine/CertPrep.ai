import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getResultModePresentation,
  ResultsSummary,
} from "@/components/results/ResultsSummary";
import type { SessionType } from "@/types/result";

const baseProps = {
  score: 80,
  correctCount: 8,
  incorrectCount: 2,
  unansweredCount: 0,
  flaggedCount: 0,
  totalQuestions: 10,
  timeTakenSeconds: 120,
  mode: "zen" as const,
  averageTimePerQuestion: 12,
};

describe("result mode presentation", () => {
  it.each([
    ["srs_review", "SRS Review"],
    ["topic_study", "Topic Study"],
    ["interleaved", "Interleaved Practice"],
  ] satisfies Array<[SessionType, string]>)(
    "uses the %s session label instead of the persisted Zen label",
    (sessionType, expectedLabel) => {
      const presentation = getResultModePresentation("zen", sessionType);

      expect(presentation.scorecardLabel).toBe(expectedLabel);
      expect(presentation.summaryLabel).toBe(expectedLabel);

      render(<ResultsSummary {...baseProps} sessionType={sessionType} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
      expect(screen.queryByText("🧘 Zen Study Mode")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["zen", "zen", "🧘 Zen Study Mode"],
    ["proctor", "proctor", "📋 Proctor Exam Mode"],
  ] as const)(
    "preserves the standard %s result presentation",
    (mode, expectedScorecardLabel, expectedSummaryLabel) => {
      const presentation = getResultModePresentation(mode, "standard");

      expect(presentation.scorecardLabel).toBe(expectedScorecardLabel);
      expect(presentation.summaryLabel).toBe(expectedSummaryLabel);

      render(
        <ResultsSummary {...baseProps} mode={mode} sessionType="standard" />,
      );

      expect(screen.getByText(expectedSummaryLabel)).toBeInTheDocument();
    },
  );
});
