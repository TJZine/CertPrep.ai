import { describe, it, expect } from "vitest";
import { hashAnswer } from "@/lib/utils";

describe("hashAnswer", () => {
  it("should generate consistent hashes for the same input", async () => {
    const input = "Option A";
    const hash1 = await hashAnswer(input);
    const hash2 = await hashAnswer(input);
    expect(hash1).toBe(hash2);
  });

  it("should generate different hashes for different inputs", async () => {
    const hash1 = await hashAnswer("Option A");
    const hash2 = await hashAnswer("Option B");
    expect(hash1).not.toBe(hash2);
  });

  it("should handle empty strings", async () => {
    const hash = await hashAnswer("");
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash.length).toBe(64);
  });

  it("should be case-sensitive (as per current implementation)", async () => {
    // Note: If we want case-insensitivity later, we'd change this test
    const hash1 = await hashAnswer("A");
    const hash2 = await hashAnswer("a");
    expect(hash1).not.toBe(hash2);
  });
});
