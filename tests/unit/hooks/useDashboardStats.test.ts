import { useEffect, useState } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSRSQuizId } from "@/db/srsQuiz";
import type { Quiz } from "@/types/quiz";

const mocks = vi.hoisted(() => ({
  quizzesToArray: vi.fn(),
  resultsSortBy: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (
    query: () => Promise<unknown>,
    dependencies: unknown[] = [],
  ): unknown => {
    const [data, setData] = useState<unknown>(undefined);
    const dependencyKey = JSON.stringify(dependencies);

    useEffect(() => {
      let isMounted = true;
      void query().then((value) => {
        if (isMounted) setData(value);
      });
      return (): void => {
        isMounted = false;
      };
      // The production hook re-runs the query when its declared dependencies change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dependencyKey]);

    return data;
  },
}));

vi.mock("@/db", () => ({
  db: {
    quizzes: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      toArray: mocks.quizzesToArray,
    },
    results: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      sortBy: mocks.resultsSortBy,
    },
  },
}));

import { useDashboardStats } from "@/hooks/useDashboardStats";

const makeQuiz = (id: string): Quiz => ({
  id,
  user_id: "user-123",
  title: id,
  description: "",
  created_at: 1,
  questions: [],
  tags: [],
  version: 1,
});

describe("useDashboardStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resultsSortBy.mockResolvedValue([]);
  });

  it("hides the internal SRS quiz while retaining aggregated activity totals", async () => {
    const srsQuizId = getSRSQuizId("user-123");
    mocks.quizzesToArray.mockResolvedValue([
      makeQuiz("certification-quiz"),
      makeQuiz(srsQuizId),
    ]);
    mocks.resultsSortBy.mockResolvedValue([
      {
        id: "aggregated-result",
        quiz_id: srsQuizId,
        user_id: "user-123",
        timestamp: 1,
        score: 80,
        time_taken_seconds: 60,
      },
    ]);

    const { result } = renderHook(() => useDashboardStats("user-123"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.overallStats?.totalQuizzes).toBe(1);
    expect(result.current.overallStats?.totalAttempts).toBe(1);
    expect(result.current.quizStats.has("certification-quiz")).toBe(true);
    expect(result.current.quizStats.has(srsQuizId)).toBe(false);
  });
});
