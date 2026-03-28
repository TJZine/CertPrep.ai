import { describe, expect, it } from "vitest";
import { computeQuizHash } from "@/lib/core/crypto";

describe("computeQuizHash", () => {
  it("returns stable hashes for identical input", async () => {
    const core = {
      title: "Quiz Title",
      description: "Quiz Description",
      tags: ["a", "b"],
      questions: [
        {
          id: "q1",
          question: "What is 2+2?",
          options: { a: "3", b: "4" },
          correct_answer_hash: "ignored-for-hash-test",
        },
      ],
    };

    const hash1 = await computeQuizHash(core);
    const hash2 = await computeQuizHash(core);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes object key order in nested structures", async () => {
    const coreA = {
      title: "Quiz Title",
      description: "Quiz Description",
      tags: ["a", "b"],
      questions: [
        {
          id: "q1",
          question: "What is 2+2?",
          options: { a: "3", b: "4" },
        },
      ],
    };

    const coreB = {
      title: "Quiz Title",
      description: "Quiz Description",
      tags: ["a", "b"],
      questions: [
        {
          id: "q1",
          question: "What is 2+2?",
          options: { b: "4", a: "3" },
        },
      ],
    };

    const hashA = await computeQuizHash(coreA);
    const hashB = await computeQuizHash(coreB);

    expect(hashA).toBe(hashB);
  });

  it("changes when meaningful fields change", async () => {
    const base = {
      title: "Quiz Title",
      description: "Quiz Description",
      tags: ["a", "b"],
      questions: [{ id: "q1", question: "What is 2+2?", options: { a: "3" } }],
    };

    const baseHash = await computeQuizHash(base);
    const changedHash = await computeQuizHash({ ...base, title: "New Title" });

    expect(changedHash).not.toBe(baseHash);
  });
});

