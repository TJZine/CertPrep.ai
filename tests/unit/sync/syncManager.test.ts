
import { describe, it, expect } from "vitest";
import { buildSyncPayload, RemoteResultSchema } from "@/lib/sync/syncManager";
import type { Result } from "@/types/result";

describe("syncManager payload construction", () => {
  const userId = "test-user-id";

  it("omits deleted_at when null to prevent resurrection", () => {
    const result = {
      id: "test-result",
      user_id: userId,
      quiz_id: "quiz-1",
      timestamp: 1234567890,
      mode: "zen",
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      question_ids: [],
      deleted_at: null,
      synced: 0,
    } as unknown as Result;

    // Verify payload doesn't include deleted_at key at all
    const payload = buildSyncPayload([result], userId);
    const item = payload[0];
    if (!item) throw new Error("Payload is empty");

    expect(item).not.toHaveProperty("deleted_at");
    expect(Object.keys(item)).not.toContain("deleted_at");
  });

  it("includes deleted_at when set", () => {
    const deletedAt = Date.now();
    const result = {
      id: "test-result",
      user_id: userId,
      quiz_id: "quiz-1",
      timestamp: 1234567890,
      mode: "zen",
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      question_ids: [],
      deleted_at: deletedAt,
      synced: 0,
    } as unknown as Result;

    const payload = buildSyncPayload([result], userId);
    const item = payload[0];
    if (!item) throw new Error("Payload is empty");

    expect(item).toHaveProperty("deleted_at");
    expect(item.deleted_at).toBe(new Date(deletedAt).toISOString());
  });

  it("rejects runtime-only flashcard mode from remote results", () => {
    const parsed = RemoteResultSchema.safeParse({
      id: "remote-result",
      quiz_id: "quiz-1",
      timestamp: 1234567890,
      mode: "flashcard",
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      created_at: "2026-04-15T12:00:00.000Z",
      updated_at: "2026-04-15T12:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes unknown remote session_type values to undefined", () => {
    const parsed = RemoteResultSchema.safeParse({
      id: "remote-result",
      quiz_id: "quiz-1",
      timestamp: 1234567890,
      mode: "zen",
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
      session_type: "legacy_custom_value",
      created_at: "2026-04-15T12:00:00.000Z",
      updated_at: "2026-04-15T12:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.session_type).toBeUndefined();
    }
  });
});
