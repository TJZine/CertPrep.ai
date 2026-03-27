/* eslint-disable */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCachedHash, getCachedHashBatch } from "@/db/hashCache";
import { db } from "@/db/dbInstance";
import { hashAnswer } from "@/lib/core/crypto";

// Mock dependencies
vi.mock("@/db/dbInstance", () => ({
  db: {
    hashCache: {
      get: vi.fn(),
      put: vi.fn(),
      bulkGet: vi.fn(),
      bulkPut: vi.fn(),
      bulkDelete: vi.fn(),
      count: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      primaryKeys: vi.fn(),
    } as unknown as any, // Use any here once if needed, but we'll try to void it
  },
}));

vi.mock("@/lib/core/crypto", () => ({
  hashAnswer: vi.fn(async (val: string) => `hash-${val}`),
}));

describe("hashCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedHash", () => {
    it("returns cached hash if available", async () => {
      (db.hashCache.get as any).mockResolvedValue({ answer: "test", hash: "cached-hash" });
      
      const result = await getCachedHash("test");
      
      expect(result).toBe("cached-hash");
      expect(hashAnswer).not.toHaveBeenCalled();
    });

    it("computes, returns and caches hash if not available", async () => {
      (db.hashCache.get as any).mockResolvedValue(null);
      (db.hashCache.put as any).mockResolvedValue("test");
      
      const result = await getCachedHash("new-answer");
      
      expect(result).toBe("hash-new-answer");
      expect(hashAnswer).toHaveBeenCalledWith("new-answer");
      expect(db.hashCache.put).toHaveBeenCalledWith(expect.objectContaining({
        answer: "new-answer",
        hash: "hash-new-answer"
      }));
    });

    it("falls back to computation on database error", async () => {
      (db.hashCache.get as any).mockRejectedValue(new Error("DB Error"));
      
      const result = await getCachedHash("error-case");
      
      expect(result).toBe("hash-error-case");
      expect(hashAnswer).toHaveBeenCalledWith("error-case");
    });
  });

  describe("getCachedHashBatch", () => {
    it("handles mixed cached and uncached answers", async () => {
      (db.hashCache.bulkGet as any).mockResolvedValue([
        { answer: "cached", hash: "hash-cached", created_at: Date.now() },
        undefined,
      ]);
      (db.hashCache.bulkPut as any).mockResolvedValue(["uncached"]);

      const results = await getCachedHashBatch(["cached", "uncached"]);
      
      expect(results.get("cached")).toBe("hash-cached");
      expect(results.get("uncached")).toBe("hash-uncached");
      expect(db.hashCache.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ answer: "uncached" })
      ]));
    });

    it("triggers eviction if cache exceeds limit", async () => {
      (db.hashCache.bulkGet as any).mockResolvedValue([undefined]);
      (db.hashCache.bulkPut as any).mockResolvedValue(["test"]);
      (db.hashCache.count as any).mockResolvedValue(10001); // Over MAX_CACHE_ENTRIES
      (db.hashCache as any).primaryKeys.mockResolvedValue(["key1", "key2"]);

      await getCachedHashBatch(["test"]);

      // Wait for fire-and-forget eviction
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(db.hashCache.count).toHaveBeenCalled();
      expect(db.hashCache.bulkDelete).toHaveBeenCalledWith(["key1", "key2"]);
    });

    it("falls back to full computation on database error", async () => {
      (db.hashCache.bulkGet as any).mockRejectedValue(new Error("Bulk DB Error"));
      
      const results = await getCachedHashBatch(["a", "b"]);
      
      expect(results.get("a")).toBe("hash-a");
      expect(results.get("b")).toBe("hash-b");
    });
  });
});
