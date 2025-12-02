import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/auth/delete-account/route';

type CookieRecord = {
  name: string;
  value: string;
  domain?: string;
  expires?: Date | number | string;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
};

const cookieJar: CookieRecord[] = [];

const supabaseAuth = {
  getUser: vi.fn(),
  signOut: vi.fn(),
};

const supabaseClient = {
  auth: supabaseAuth,
};

const supabaseAdminClient = {
  auth: {
    admin: {
      deleteUser: vi.fn(),
    },
  },
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((): typeof supabaseClient => supabaseClient),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((): typeof supabaseAdminClient => supabaseAdminClient),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: (): CookieRecord[] => cookieJar,
    set: (name: string, value: string, options?: Partial<CookieRecord>): void => {
      cookieJar.push({ name, value, ...options });
    },
  })),
}));

describe('DELETE /api/auth/delete-account', () => {
  beforeEach(() => {
    cookieJar.length = 0;
    process.env.NEXT_PUBLIC_SITE_URL = 'https://certprep.ai';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

    supabaseAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    supabaseAuth.signOut.mockImplementation(async () => {
      cookieJar.push({ name: 'sb-access-token', value: '', maxAge: 0, path: '/' });
      return { error: null };
    });
    supabaseAdminClient.auth.admin.deleteUser.mockResolvedValue({ error: null });
  });

  it('deletes the user and clears auth cookies', async () => {
    const request = new NextRequest('https://certprep.ai/api/auth/delete-account', {
      method: 'DELETE',
      headers: {
        origin: 'https://certprep.ai',
        'sec-fetch-site': 'same-origin',
      },
    });

    const response = await DELETE(request);

    expect(response.status).toBe(200);
    expect(supabaseAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
    expect(supabaseAuth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(response.cookies.get('sb-access-token')?.value).toBe('');
  });
});
