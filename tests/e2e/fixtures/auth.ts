import type { Page } from '@playwright/test';

/**
 * Mock user data for E2E tests.
 * This ID is used as both the Supabase user ID and the guest user ID fallback.
 */
import fs from 'fs';
import path from 'path';

/**
 * Get the test user ID from the global setup output.
 */
function getTestUserId(): string {
  try {
    const authDir = path.join(__dirname, '../.auth');
    const userIdPath = path.join(authDir, 'user-id.json');
    if (fs.existsSync(userIdPath)) {
      const data = JSON.parse(fs.readFileSync(userIdPath, 'utf-8'));
      return data.id;
    }
  } catch (e) {
    console.warn('Could not read test user ID from file, using fallback', e);
  }
  return 'e2e-test-user-00000000-0000-0000-0000-000000000001';
}

export const TEST_USER_ID = getTestUserId();

/**
 * Mock user data for E2E tests.
 * This ID is used as both the Supabase user ID and the guest user ID fallback.
 */
export const MOCK_USER = {
  id: TEST_USER_ID,
  email: 'e2e-test@certprep.local',
  role: 'authenticated',
  aud: 'authenticated',
} as const;

/**
 * Guest user localStorage key - used by useEffectiveUserId hook.
 */
const GUEST_USER_KEY = 'cp_guest_user_id';

/**
 * Generate a mock JWT token that looks valid structurally.
 */
function generateMockToken(): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'authenticated',
    exp: now + 3600,
    iat: now,
    iss: 'https://e2e-test-project.supabase.co/auth/v1',
    sub: MOCK_USER.id,
    email: MOCK_USER.email,
    role: 'authenticated',
    session_id: 'e2e-mock-session-id',
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mockSignature = 'e2e-mock-signature';

  return `${base64Header}.${base64Payload}.${mockSignature}`;
}

/**
 * Creates a mock Supabase session object.
 */
export function createMockSession(): {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email: string;
    email_confirmed_at: string;
    created_at: string;
    updated_at: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  };
} {
  const now = Math.floor(Date.now() / 1000);
  const isoNow = new Date().toISOString();

  return {
    access_token: generateMockToken(),
    refresh_token: `e2e-mock-refresh-token-${Date.now()}`,
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: MOCK_USER.id,
      aud: MOCK_USER.aud,
      role: MOCK_USER.role,
      email: MOCK_USER.email,
      email_confirmed_at: isoNow,
      created_at: isoNow,
      updated_at: isoNow,
      app_metadata: {},
      user_metadata: {},
    },
  };
}

/**
 * Injects mock user state into the browser context.
 * This sets up both the guest user ID AND the Supabase session in localStorage.
 *
 * @param page - Playwright page to inject auth state into
 */
export async function injectAuthState(page: Page): Promise<void> {
  // If storageState is used, the session is already in localStorage/cookies.
  // We just need to ensure app-specific keys are set if they aren't already.
  
  await page.goto('/');

  await page.evaluate(
    ({ userId, guestKey }) => {
      // Set the guest user ID that useEffectiveUserId will use
      localStorage.setItem(guestKey, userId);

      // Also set app-specific user tracking for sync
      localStorage.setItem('cp_last_user_id', userId);
      
      // Note: We don't need to set the Supabase token here because 
      // Playwright's storageState handles it.
    },
    { userId: MOCK_USER.id, guestKey: GUEST_USER_KEY }
  );
  
  // Debug: Check cookies
  const cookies = await page.evaluate(() => document.cookie);
  console.log('injectAuthState: MOCK_USER.id:', MOCK_USER.id);
  console.log('injectAuthState: Cookies:', cookies);

  // Reload to ensure the app picks up the new auth state
  await page.reload();
}

/**
 * Clears authentication state from the browser.
 *
 * @param page - Playwright page to clear auth state from
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate((guestKey) => {
    localStorage.removeItem(guestKey);
    localStorage.removeItem('cp_last_user_id');
    localStorage.removeItem('sb-e2e-test-project-auth-token');
  }, GUEST_USER_KEY);
}
