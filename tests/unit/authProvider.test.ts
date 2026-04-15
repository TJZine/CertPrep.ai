import { describe, expect, it, vi } from "vitest";
import { performSignOut } from "@/components/providers/AuthProvider";
import type { CoordinatedSyncOutcome, SyncDomain } from "@/lib/sync/coordinator";

const { runSyncPlan } = vi.hoisted(() => ({
  runSyncPlan: vi.fn(),
}));

vi.mock("@/lib/sync/coordinator", () => ({
  runSyncPlan,
  requiresLocalDataPreservation: (
    outcome: PromiseSettledResult<CoordinatedSyncOutcome> | undefined,
  ): boolean => {
    if (!outcome) return false;
    if (outcome.status === "rejected") return true;
    return (
      outcome.value.status === "skipped" ||
      outcome.value.status === "failed" ||
      Boolean(outcome.value.incomplete)
    );
  },
}));

function buildSyncSummary(
  overrides: Partial<Record<SyncDomain, CoordinatedSyncOutcome>> = {},
): {
  domains: readonly SyncDomain[];
  settlements: Partial<Record<SyncDomain, PromiseSettledResult<CoordinatedSyncOutcome>>>;
  outcomes: Record<SyncDomain, CoordinatedSyncOutcome>;
} {
  const outcomes: Record<SyncDomain, CoordinatedSyncOutcome> = {
    quizzes: { incomplete: false, status: "synced" },
    results: { incomplete: false, status: "synced" },
    srs: { incomplete: false, status: "synced" },
    ...overrides,
  };

  return {
    domains: ["quizzes", "results", "srs"],
    settlements: {
      quizzes: { status: "fulfilled", value: outcomes.quizzes },
      results: { status: "fulfilled", value: outcomes.results },
      srs: { status: "fulfilled", value: outcomes.srs },
    },
    outcomes,
  };
}

const createSupabaseStub = (): {
  auth: { signOut: ReturnType<typeof vi.fn> };
} => {
  const signOut = vi.fn().mockResolvedValue(undefined);
  return {
    auth: {
      signOut,
    },
  } as const;
};

describe("performSignOut", () => {
  it("continues sign-out when clearing Dexie fails but surfaces warning", async () => {
    runSyncPlan.mockResolvedValue(buildSyncSummary());
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockRejectedValue(new Error("Dexie failure"));
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(true);
    expect(result.error).toMatch(/Local data could not be cleared/i);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it("signs out and resets auth state on success", async () => {
    runSyncPlan.mockResolvedValue(buildSyncSummary());
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(clearDb).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it("returns error when signOut fails after clearing database", async () => {
    runSyncPlan.mockResolvedValue(buildSyncSummary());
    const supabase = createSupabaseStub();
    supabase.auth.signOut.mockRejectedValue(new Error("Supabase failure"));
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Sign out failed/i);
    expect(clearDb).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).not.toHaveBeenCalled();
  });

  it("blocks sign-out when pre-logout sync is incomplete", async () => {
    runSyncPlan.mockResolvedValue(
      buildSyncSummary({
        results: { incomplete: true, status: "failed" },
      }),
    );
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect(result.error).toMatch(/kept on this device/i);
    expect(clearDb).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it("still signs out when pre-logout sync times out", async () => {
    runSyncPlan.mockImplementation(
      () =>
        new Promise(() => undefined) as ReturnType<typeof runSyncPlan>,
    );
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect(result.error).toMatch(/kept on this device/i);
    expect(clearDb).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it("preserves local data when pre-logout sync is skipped in another tab", async () => {
    runSyncPlan.mockResolvedValue(
      buildSyncSummary({
        quizzes: { incomplete: false, status: "skipped" },
      }),
    );
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
      userId: "user-123",
    });

    expect(result.success).toBe(true);
    expect(result.error).toMatch(/kept on this device/i);
    expect(clearDb).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it("preserves local data when SRS is incomplete during logout sync", async () => {
    runSyncPlan.mockResolvedValue(
      buildSyncSummary({
        srs: { incomplete: true, status: "failed" },
      }),
    );
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
      userId: "user-123",
    });

    expect(runSyncPlan).toHaveBeenCalledWith("user-123", "logout");
    expect(result.success).toBe(true);
    expect(result.error).toMatch(/kept on this device/i);
    expect(clearDb).not.toHaveBeenCalled();
  });
});
