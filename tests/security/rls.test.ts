import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateUUID } from '@/lib/utils';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Skip tests if credentials are missing
const shouldRun = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe.skipIf(!shouldRun)('Row Level Security (RLS) Verification', () => {
  let supabase: SupabaseClient;
  let userA: { id: string; email: string; client: SupabaseClient };
  let userB: { id: string; email: string; client: SupabaseClient };

  // Helper function to clear database tables
  const clearDatabase = async (): Promise<void> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Cannot clear database for tests.');
      return;
    }

    const adminClient = createClient(url, serviceRoleKey);

    // Delete all data from 'results' table
    const { error: deleteResultsError } = await adminClient.from('results').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    if (deleteResultsError) {
      console.error('Error clearing results table:', deleteResultsError);
      throw deleteResultsError;
    }

    // Delete all test users
    // This is a bit tricky as Supabase doesn't have a direct "delete all users" API.
    // We'll rely on the afterAll hook to clean up specific users created by the tests.
    // For a more robust solution, one might query all users and delete them,
    // but that's generally not recommended for production environments.
  };

  beforeAll(async () => {
    // Ensure we have a clean state before starting tests
    await clearDatabase();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabase = createClient(url, key);

    // Helper to create a test user and client
    const createTestUser = async (): Promise<{ id: string; email: string; client: SupabaseClient }> => {
      const email = `test-${generateUUID()}@example.com`;
      const password = 'test-password-123';
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      let userId: string;

      if (serviceRoleKey) {
        // Use admin API to bypass captcha/email verification
        const adminClient = createClient(url, serviceRoleKey);
        
        // 1. Create User
        const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError || !userData.user) {
          throw new Error(`Failed to create test user (admin): ${createError?.message}`);
        }
        userId = userData.user.id;

        // 2. Generate Magic Link (to get a valid session without hitting login endpoint)
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'magiclink',
          email,
        });

        if (linkError || !linkData.properties?.email_otp) {
           throw new Error(`Failed to generate magic link: ${linkError?.message}`);
        }

        // 3. Verify OTP to get session (bypasses login captcha)
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          email,
          token: linkData.properties.email_otp,
          type: 'magiclink',
        });

        if (sessionError || !sessionData.session) {
          throw new Error(`Failed to verify OTP: ${sessionError?.message}`);
        }

        const userClient = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } },
        });

        return { id: userId, email, client: userClient };
      } else {
        // Fallback to public signup (will fail if captcha is on)
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error || !data.user) {
          throw new Error(`Failed to create test user (public): ${error?.message}`);
        }
        userId = data.user.id;

        // Create a client for this user (login to get session)
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError || !loginData.session) {
          throw new Error(`Failed to sign in test user: ${loginError?.message}`);
        }

        const userClient = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } },
        });

        return { id: userId, email, client: userClient };
      }
    };

    try {
      userA = await createTestUser();
      userB = await createTestUser();
    } catch (e) {
      if (process.env.CI) {
        throw new Error(`Failed to create test users in CI environment: ${e instanceof Error ? e.message : String(e)}`);
      }
      console.warn('Skipping RLS tests: Could not create test users (Auth might be disabled or require confirmation)', e);
      // Explicitly fail the setup so tests don't run and falsely pass. 
      // In a real scenario, we might want to skip, but for security tests, explicit failure is safer than silent skipping.
      throw new Error('Setup failed: Could not create test users. Tests cannot run.');
    }
  });

  // Cleanup test users
  afterAll(async () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey && userA && userB) {
      const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);
      try {
        // Clean up results first (cascade might handle this, but explicit is safer)
        await adminClient.from('results').delete().in('user_id', [userA.id, userB.id]);
        // Delete users
        await adminClient.auth.admin.deleteUser(userA.id);
        await adminClient.auth.admin.deleteUser(userB.id);
      } catch (error) {
        console.warn('Failed to cleanup test users:', error);
      }
    }
  });

  it('User A should be able to insert and read their own results', async () => {

    const resultId = generateUUID();
    const resultData = {
      id: resultId,
      user_id: userA.id,
      quiz_id: generateUUID(),
      timestamp: Date.now(),
      mode: 'practice',
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
    };

    const { error: insertError } = await userA.client
      .from('results')
      .insert(resultData);

    expect(insertError).toBeNull();

    const { data, error: selectError } = await userA.client
      .from('results')
      .select('*')
      .eq('id', resultId)
      .single();

    expect(selectError).toBeNull();
    expect(data).toBeDefined();
    expect(data.id).toBe(resultId);
  });

  it('User B should NOT be able to read User A\'s results', async () => {

    // User A creates a record (already done in previous test, but let's make a new one to be sure)
    const resultId = generateUUID();
    const resultData = {
      id: resultId,
      user_id: userA.id,
      quiz_id: generateUUID(),
      timestamp: Date.now(),
      mode: 'practice',
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
    };

    await userA.client.from('results').insert(resultData);

    // User B tries to fetch it
    const { data } = await userB.client
      .from('results')
      .select('*')
      .eq('id', resultId)
      .maybeSingle(); // Use maybeSingle to avoid error on 0 rows, we expect 0 rows

    // Expect no data found
    expect(data).toBeNull();
    // Error might be null (just no rows found) or a permission error depending on policy
  });

  it('User B should NOT be able to update User A\'s results', async () => {

    // User A creates a record
    const resultId = generateUUID();
    const resultData = {
      id: resultId,
      user_id: userA.id,
      quiz_id: generateUUID(),
      timestamp: Date.now(),
      mode: 'practice',
      score: 100,
      time_taken_seconds: 60,
      answers: {},
      flagged_questions: [],
      category_breakdown: {},
    };

    await userA.client.from('results').insert(resultData);

    // User B tries to update it
    await userB.client
      .from('results')
      .update({ score: 0 })
      .eq('id', resultId)
      .select(); // select to see if it returns anything

    // Should not update anything
    // Note: Supabase update policies often silently ignore rows you can't see/edit
    // So we check if the data actually changed by reading it back as User A
    
    const { data: checkData } = await userA.client
      .from('results')
      .select('score')
      .eq('id', resultId)
      .single();

    expect(checkData?.score).toBe(100);
  });
});
