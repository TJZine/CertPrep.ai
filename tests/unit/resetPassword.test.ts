import { describe, expect, it, vi } from 'vitest';
import { exchangeRecoverySession } from '@/components/auth/ResetPasswordForm';

const createSupabaseStub = (): { auth: { exchangeCodeForSession: ReturnType<typeof vi.fn>; setSession: ReturnType<typeof vi.fn> } } => {
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
  const setSession = vi.fn().mockResolvedValue({ error: null });

  return {
    auth: {
      exchangeCodeForSession,
      setSession,
    },
  } as const;
};

describe('exchangeRecoverySession', () => {
  it('exchanges code for session when recovery code is present', async () => {
    const supabase = createSupabaseStub();
    const result = await exchangeRecoverySession(
      supabase as never,
      {
        type: 'recovery',
        code: 'abc123',
        accessToken: null,
        refreshToken: null,
      }
    );

    expect(result.success).toBe(true);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns failure when recovery tokens are missing', async () => {
    const supabase = createSupabaseStub();
    const result = await exchangeRecoverySession(
      supabase as never,
      { type: 'recovery', code: null, accessToken: null, refreshToken: null }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/recovery link is invalid/i);
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
  });

  it('surfaces errors from Supabase', async () => {
    const supabase = createSupabaseStub();
    supabase.auth.exchangeCodeForSession.mockResolvedValueOnce({ error: new Error('token expired') });

    const result = await exchangeRecoverySession(
      supabase as never,
      { type: 'recovery', code: 'abc123', accessToken: null, refreshToken: null }
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/recovery link is invalid/i);
  });

  it('sets session when access and refresh tokens are provided', async () => {
    const supabase = createSupabaseStub();

    const result = await exchangeRecoverySession(
      supabase as never,
      { type: 'recovery', code: null, accessToken: 'access', refreshToken: 'refresh' }
    );

    expect(result.success).toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
