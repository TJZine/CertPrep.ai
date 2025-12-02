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
  it('fails and avoids redirect when clearing Dexie fails', async () => {
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

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to clear local data/);
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(onResetAuthState).not.toHaveBeenCalled();
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
});
