import { describe, expect, it, vi } from "vitest";
import { performSignOut } from "@/components/providers/AuthProvider";

const { syncQuizzes, syncResults } = vi.hoisted(() => ({
  syncQuizzes: vi.fn(),
  syncResults: vi.fn(),
}));

vi.mock("@/lib/sync/quizSyncManager", () => ({
  syncQuizzes,
}));

vi.mock("@/lib/sync/syncManager", () => ({
  syncResults,
}));

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
    syncQuizzes.mockResolvedValue({ incomplete: false });
    syncResults.mockResolvedValue({ incomplete: false });
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
    syncQuizzes.mockResolvedValue({ incomplete: false });
    syncResults.mockResolvedValue({ incomplete: false });
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
    syncQuizzes.mockResolvedValue({ incomplete: false });
    syncResults.mockResolvedValue({ incomplete: false });
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
    syncQuizzes.mockResolvedValue({ incomplete: true });
    syncResults.mockResolvedValue({ incomplete: false });
    const supabase = createSupabaseStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      clearDb,
      onResetAuthState,
      userId: "user-123",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sync/i);
    expect(clearDb).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(onResetAuthState).not.toHaveBeenCalled();
  });
});
