import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

export default async function globalSetup(config: FullConfig): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('GlobalSetup Supabase URL:', supabaseUrl);

  const testEmail = 'e2e-test@certprep.local';
  const testPassword = 'TestPassword123!';

  // 1. Check if user exists, create if not
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  let userId = users.find(u => u.email === testEmail)?.id;
  
  if (userId) {
    // eslint-disable-next-line no-console -- Debug logging for E2E tests
    console.log('Updating E2E test user password...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: testPassword,
      email_confirm: true,
    });
    if (updateError) throw updateError;
  } else {
    // eslint-disable-next-line no-console -- Debug logging for E2E tests
    console.log('Creating E2E test user...');
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (createError) throw createError;
    userId = data.user.id;
  }

  // Use baseURL from config or default to localhost:3000
  const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3000';

  // 2. UI Login via Magic Link (Manual Session Injection)
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Generating magic link for E2E login...');
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail,
    options: {
      redirectTo: `${baseURL}/`,
    },
  });
  
  if (linkError) throw linkError;
  if (!linkData.properties?.action_link) throw new Error('Failed to generate magic link');
  
  const magicLink = linkData.properties.action_link;
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Magic link generated. Fetching to extract tokens...');

  // Fetch the magic link to get the redirect URL with tokens
  const response = await fetch(magicLink, { redirect: 'manual' });
  const location = response.headers.get('location');
  
  if (!location) {
    throw new Error('Magic link did not redirect as expected');
  }
  
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Redirect location obtained. Extracting tokens...');
  const hash = location.split('#')[1];
  if (!hash) {
    throw new Error('Redirect location does not contain hash fragment');
  }
  
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  
  if (!access_token || !refresh_token) {
    throw new Error('Failed to extract tokens from hash');
  }

  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Tokens extracted. Injecting into browser...');
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Access Token Length:', access_token.length);
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  console.log('Refresh Token Length:', refresh_token.length);
  
  try {
    const tokenPart = access_token.split('.')[1];
    if (tokenPart) {
      const payload = JSON.parse(Buffer.from(tokenPart, 'base64').toString());
      // eslint-disable-next-line no-console -- Debug logging for E2E tests
      console.log('Token Payload sub:', payload.sub);
      // eslint-disable-next-line no-console -- Debug logging for E2E tests
      console.log('Token Payload aud:', payload.aud);
    }
  } catch (e) {
    console.error('Failed to decode token payload:', e);
  }

  const browser = await chromium.launch({
    args: ['--disable-web-security'],
  });
  const page = await browser.newPage();
  
  // Debug: Forward browser logs to terminal
  // eslint-disable-next-line no-console -- Debug logging for E2E tests
  page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
  page.on('pageerror', err => console.error(`BROWSER ERROR: ${err}`));
  
  try {
    // Construct session object
    const tokenPart = access_token.split('.')[1];
    if (!tokenPart) throw new Error('Invalid access token format');
    
    const payload = JSON.parse(Buffer.from(tokenPart, 'base64').toString());
    
    const session = {
      access_token,
      refresh_token,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: payload.sub,
        aud: payload.aud,
        email: payload.email,
        role: payload.role,
        app_metadata: payload.app_metadata,
        user_metadata: payload.user_metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    };

    // Set cookie directly
    // Cookie name format: sb-<project-ref>-auth-token
    // Project ref is in the Supabase URL: https://<ref>.supabase.co
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (!projectRef) throw new Error('Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL');
    
    const cookieName = `sb-${projectRef}-auth-token`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeping for reference of alternative format
    const cookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64');
    // Note: @supabase/ssr might use a different format. 
    // Standard supabase-js uses: key = sb-<ref>-auth-token, value = base64(JSON.stringify(session))
    // But @supabase/ssr might chunk it.
    // Let's try the standard format first.
    // Actually, let's try to set it as a plain JSON string first, as some adapters do that.
    // But wait, the client expects it to be parseable.
    
    // Let's try to use the window.supabase.auth.setSession approach one last time but with a page reload check?
    // No, let's stick to cookies.
    
    // To be safe, let's try to set it via page.evaluate using the client's internal storage key if possible?
    // No, that's internal.
    
    // Let's try setting the cookie with the base64 value.
    // However, the prefix 'base64-' is used by some adapters. 
    // Standard supabase-js just stores the stringified session.
    // But if it's a cookie, it usually needs to be encoded.
    
    // Let's try to set it as a raw JSON string first (URI encoded).
    const cookieValueJson = JSON.stringify(session);
    const cookieValueBase64 = Buffer.from(cookieValueJson).toString('base64');
    
    // We will set BOTH formats to be sure? No, that might confuse it.
    // Let's check what the client does.
    // The client reads the cookie.
    
    // Let's try setting it via context.addCookies
    await page.context().addCookies([{
      name: cookieName,
      value: `base64-${cookieValueBase64}`, // Try this format first
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }]);
    
    // eslint-disable-next-line no-console -- Debug logging for E2E tests
    console.log('Cookie injected:', cookieName);

    // Navigate to home page
    await page.goto(`${baseURL}/`);
    
    // Wait for client-side auth to complete and cookies to be set
    // We check for the user email in the header
    await page.getByText(testEmail).first().waitFor({ state: 'visible', timeout: 10000 });
    
    // eslint-disable-next-line no-console -- Debug logging for E2E tests
    console.log('Login successful via manual injection!');
    
    // Ensure auth directory exists
    const authDir = path.join(__dirname, '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir);
    }

    // 3. Save storage state (cookies + localStorage)
    await page.context().storageState({ path: path.join(authDir, 'user.json') });
    
    // 4. Save user ID for fixtures
    fs.writeFileSync(
      path.join(authDir, 'user-id.json'),
      JSON.stringify({ id: userId }, null, 2)
    );
    
    // eslint-disable-next-line no-console -- Debug logging for E2E tests
    console.log('E2E auth state saved to tests/e2e/.auth/user.json');
  } catch (error) {
    console.error('UI Login failed:', error);
    // Capture screenshot on failure if possible, though we might not see it easily in this env
    try {
        await page.screenshot({ path: 'login-failure.png' });
    } catch (e) {
        console.error('Failed to take screenshot:', e);
    }
    throw error;
  } finally {
    await browser.close();
  }
}
