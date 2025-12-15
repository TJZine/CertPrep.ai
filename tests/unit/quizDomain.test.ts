import { describe, expect, it } from "vitest";
import { computeQuizHash, resolveQuizConflict, toRemoteQuiz } from "@/lib/sync/quizDomain";
import type { Quiz } from "@/types/quiz";

const baseQuiz: Quiz = {
  id: "quiz-1",
  user_id: "user-1",
  title: "Sample Quiz",
  description: "Desc",
  created_at: 1,
  updated_at: 1,
  questions: [
    {
      id: "q1",
      category: "cat",
      question: "What?",
      options: { a: "A", b: "B" },
      explanation: "Because",
    },
  ],
  tags: ["tag"],
  version: 1,
  deleted_at: null,
  quiz_hash: "hash-1",
  last_synced_at: null,
  last_synced_version: null,
};

describe("quizDomain", () => {
  it("computes deterministic quiz hash regardless of object key order", async () => {
    const hashA = await computeQuizHash({
      title: baseQuiz.title,
      description: baseQuiz.description,
      tags: baseQuiz.tags,
      questions: baseQuiz.questions,
    });

    const hashB = await computeQuizHash({
      description: baseQuiz.description,
      title: baseQuiz.title,
      questions: [
        {
          ...baseQuiz.questions[0]!,
          options: { b: "B", a: "A" },
        },
      ],
      tags: [...baseQuiz.tags],
    });

    expect(hashA).toBe(hashB);
  });

  it("prefers higher version and deleted state during conflict resolution", () => {
    const local: Quiz = { ...baseQuiz, version: 2, deleted_at: null };
    const remote: Quiz = {
      ...baseQuiz,
      version: 3,
      deleted_at: Date.now(),
      quiz_hash: "hash-remote",
    };

    const result = resolveQuizConflict(local, remote);

    expect(result.winner).toBe("remote");
    expect(result.merged.deleted_at).toEqual(remote.deleted_at);
  });

  describe("toRemoteQuiz", () => {
    it("includes category and subcategory in remote payload", async () => {
      const quizWithCategory: Quiz = {
        ...baseQuiz,
        category: "Insurance",
        subcategory: "Personal Lines",
      };

      const remote = await toRemoteQuiz("user-1", quizWithCategory);

      expect(remote.category).toBe("Insurance");
      expect(remote.subcategory).toBe("Personal Lines");
    });

    it("sets category and subcategory to null when not present", async () => {
      const quizWithoutCategory: Quiz = {
        ...baseQuiz,
        category: undefined,
        subcategory: undefined,
      };

      const remote = await toRemoteQuiz("user-1", quizWithoutCategory);

      expect(remote.category).toBeNull();
      expect(remote.subcategory).toBeNull();
    });
  });
});
