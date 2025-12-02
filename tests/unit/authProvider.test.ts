import { describe, expect, it, vi } from 'vitest';
import { performSignOut } from '@/components/providers/AuthProvider';

const createSupabaseStub = (): { auth: { signOut: ReturnType<typeof vi.fn> } } => {
  const signOut = vi.fn().mockResolvedValue(undefined);
  return {
    auth: {
      signOut,
    },
  } as const;
};

const createRouterStub = (): { push: ReturnType<typeof vi.fn> } => ({
  push: vi.fn(),
});

describe('performSignOut', () => {
  it('continues sign-out when clearing Dexie fails but surfaces warning', async () => {
    const supabase = createSupabaseStub();
    const router = createRouterStub();
    const clearDb = vi.fn().mockRejectedValue(new Error('Dexie failure'));
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      router: router as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(true);
    expect(result.error).toMatch(/Local data could not be cleared/i);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
  });

  it('signs out and resets auth state on success', async () => {
    const supabase = createSupabaseStub();
    const router = createRouterStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      router: router as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(clearDb).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('returns error when signOut fails after clearing database', async () => {
    const supabase = createSupabaseStub();
    supabase.auth.signOut.mockRejectedValue(new Error('Supabase failure'));
    const router = createRouterStub();
    const clearDb = vi.fn().mockResolvedValue(undefined);
    const onResetAuthState = vi.fn();

    const result = await performSignOut({
      supabase: supabase as never,
      router: router as never,
      clearDb,
      onResetAuthState,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Sign out failed/i);
    expect(clearDb).toHaveBeenCalledTimes(1);
    expect(onResetAuthState).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
