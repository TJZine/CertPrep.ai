# Playwright E2E Test Suite - Implementation Handoff

## 👤 Persona: QA Engineer / E2E Test Specialist

**Who you are:**
- Experienced with Playwright E2E testing frameworks
- Familiar with Next.js 16 App Router and React 19
- Comfortable with IndexedDB/Dexie.js and offline-first architectures
- Understanding of Supabase authentication and API mocking strategies
- Able to debug complex async flows and network interception

**Your goal:**
Complete the full "Airplane Mode" E2E test scenario that verifies:
1. ✅ Quiz results are saved locally when offline (DONE)
2. ❌ Results sync to Supabase when connectivity is restored (PARTIAL - needs completion)
3. ❌ Local database is updated to `synced: 1` after successful sync (NOT VERIFIED)

---

## 📋 Current State

### ✅ What's Working (7/7 tests passing)

**Infrastructure:**
- ✅ Playwright installed and configured (`playwright.config.ts`)
- ✅ Test fixtures for authentication and database helpers
- ✅ IndexedDB query helpers using raw API (bypasses Dexie exposure issues)
- ✅ Supabase API route mocking infrastructure
- ✅ Test data seeding utilities

**Test Coverage:**
- ✅ Offline data persistence (results saved with `synced: 0`)
- ✅ Data structure integrity verification
- ✅ Multiple offline quiz attempts
- ✅ App functionality while offline
- ✅ Quiz completion while offline

**Files Created:**
```
tests/e2e/
├── fixtures/
│   ├── auth.ts          # Mock user authentication
│   └── index.ts         # Extended Playwright test fixtures
├── helpers/
│   └── db.ts            # IndexedDB query helpers
└── offline-sync.spec.ts  # Main test suite (7 tests)
```

### ❌ What's Missing

**The Core Gap:**
The tests verify that data is saved locally (`synced: 0`), but they **cannot verify** that:
- Sync requests actually reach Supabase
- The `synced` flag transitions from `0` → `1` after sync
- Network payloads match expected structure

**Why It's Missing:**
1. **Authentication Challenge:** The app's `useSync` hook only runs when `user?.id` exists from Supabase auth. Our mock auth doesn't properly integrate with the Supabase JS SDK's internal session validation.
2. **SDK Validation:** Supabase JS SDK validates JWT tokens cryptographically. Our mock tokens are structurally correct but fail signature validation.
3. **Timing Issues:** Even with mocked routes, the sync may not trigger because the auth state isn't recognized by the app's auth provider.

---

## 🎯 Target: Complete "Airplane Mode" Scenario

### Original Test Plan (from `playwright.plan.md`)

```typescript
test('saves quiz results locally when offline and syncs when back online', async ({
  authenticatedPage: page,
  context,
  syncRequests,
}) => {
  // 1. Seed quiz, navigate, go offline
  // 2. Take quiz offline → verify synced: 0 ✅ (DONE)
  // 3. Go back online
  // 4. Wait for sync to complete
  // 5. Verify synced: 1 ❌ (NOT WORKING)
  // 6. Verify network request was made with correct payload ❌ (NOT WORKING)
});
```

### What We Need to Achieve

1. **Trigger Real Sync:** Make `useSync` hook actually execute sync logic
2. **Verify Network Calls:** Confirm POST requests to `/rest/v1/results` with correct payload
3. **Verify Database Update:** Confirm `synced: 0` → `synced: 1` transition
4. **Handle Edge Cases:** Multiple results, sync failures, retries

---

## 🔧 Step-by-Step Implementation Guide

### Phase 1: Fix Authentication Integration

**Problem:** The app's `AuthProvider` uses `supabase.auth.getSession()` which validates tokens. Our mocks don't satisfy this.

**Solution Options:**

#### Option A: Real Test User (Recommended for CI/CD)

**Pros:**
- Most realistic test scenario
- Tests actual auth flow
- No mocking complexity

**Cons:**
- Requires Supabase credentials
- Slower (real network calls)
- Test data cleanup needed

**Implementation:**

1. **Create Test User in Supabase:**
   ```bash
   # Use Supabase CLI or dashboard to create:
   # Email: e2e-test@certprep.local
   # Password: (store in GitHub Secrets)
   ```

2. **Update `tests/e2e/fixtures/auth.ts`:**
   ```typescript
   export async function injectAuthState(page: Page): Promise<void> {
     await page.goto('/login');
     
     // Fill login form with test credentials
     await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL!);
     await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD!);
     await page.click('button[type="submit"]');
     
     // Wait for redirect after login
     await page.waitForURL('/');
   }
   ```

3. **Update `playwright.config.ts`:**
   ```typescript
   use: {
     // ... existing config
     // Store auth state for reuse
     storageState: 'tests/e2e/.auth/user.json',
   },
   ```

4. **Add Global Setup (`tests/e2e/global-setup.ts`):**
   ```typescript
   import { chromium, type FullConfig } from '@playwright/test';
   
   async function globalSetup(config: FullConfig) {
     const browser = await chromium.launch();
     const page = await browser.newPage();
     
     // Login once, save state
     await page.goto('http://localhost:3000/login');
     await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL!);
     await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD!);
     await page.click('button[type="submit"]');
     await page.waitForURL('/');
     
     await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
     await browser.close();
   }
   
   export default globalSetup;
   ```

5. **Update `playwright.config.ts` to use global setup:**
   ```typescript
   export default defineConfig({
     // ... existing config
     globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
   });
   ```

#### Option B: Deep SDK Mocking (Advanced)

**Pros:**
- No external dependencies
- Fast execution
- Full control

**Cons:**
- Complex implementation
- May break with SDK updates
- Requires understanding Supabase internals

**Implementation:**

1. **Create Supabase Mock Module (`tests/e2e/mocks/supabase.ts`):**
   ```typescript
   // Mock the entire @supabase/supabase-js module
   export const mockSupabaseClient = {
     auth: {
       getSession: async () => ({
         data: {
           session: {
             access_token: 'mock-token',
             user: { id: MOCK_USER.id, email: MOCK_USER.email },
           },
         },
         error: null,
       }),
       getUser: async () => ({
         data: { user: { id: MOCK_USER.id } },
         error: null,
       }),
     },
     from: (table: string) => ({
       select: () => ({ eq: () => ({ data: [], error: null }) }),
       upsert: (data: unknown) => Promise.resolve({ data, error: null }),
     }),
   };
   ```

2. **Use Playwright's `routeFromHAR` or Module Replacement:**
   - This is complex and may require webpack/Next.js config changes
   - Not recommended unless Option A is impossible

### Phase 2: Enhance Sync Verification

**Current State:** We capture sync requests but they may not be triggered.

**What to Add:**

1. **Explicit Sync Trigger:**
   ```typescript
   // In test, after going online:
   await context.setOffline(false);
   await page.goto('/');
   
   // Wait for sync hook to initialize
   await page.waitForTimeout(1000);
   
   // Manually trigger sync via exposed function
   await page.evaluate(() => {
     // Expose sync function in test mode
     if (window.__certprepSync) {
       return window.__certprepSync();
     }
   });
   ```

2. **Expose Sync Function (in `src/hooks/useSync.ts`):**
   ```typescript
   // Add to useSync hook (development/test only):
   if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
     (window as Window & { __certprepSync?: () => Promise<void> }).__certprepSync = sync;
   }
   ```

3. **Enhanced Request Verification:**
   ```typescript
   // In test:
   await expect.poll(
     async () => {
       // Check both network AND database
       const requests = syncRequests.filter(req => 
         req.url.includes('/rest/v1/results') && 
         req.body && 
         Array.isArray(req.body) &&
         req.body.some((item: any) => item.quiz_id === quiz.id)
       );
       
       const results = await getResultsByUserId(page, MOCK_USER.id);
       const result = results.find(r => r.quiz_id === quiz.id);
       
       return {
         requestMade: requests.length > 0,
         synced: result?.synced === 1,
       };
     },
     {
       message: 'Sync should complete: request made AND synced flag updated',
       timeout: 20000,
     }
   ).toEqual({ requestMade: true, synced: true });
   ```

### Phase 3: Add Comprehensive Test Cases

**New Tests to Add:**

1. **Sync Failure Recovery:**
   ```typescript
   test('retries sync after network failure', async ({ page, context }) => {
     // 1. Create unsynced result
     // 2. Mock Supabase to return 500 error
     // 3. Trigger sync
     // 4. Verify result still has synced: 0
     // 5. Fix mock to return 201
     // 6. Trigger sync again
     // 7. Verify synced: 1
   });
   ```

2. **Multiple Results Batch Sync:**
   ```typescript
   test('syncs multiple results in single batch', async ({ page, context }) => {
     // 1. Create 5 unsynced results
     // 2. Go online
     // 3. Verify single POST request with array of 5 results
     // 4. Verify all 5 have synced: 1
   });
   ```

3. **Sync Conflict Resolution:**
   ```typescript
   test('handles sync conflicts when remote data exists', async ({ page, context }) => {
     // 1. Mock GET /results to return existing remote result
     // 2. Create local result with same quiz_id
     // 3. Trigger sync
     // 4. Verify conflict resolution (merge or skip)
   });
   ```

4. **Sync Performance:**
   ```typescript
   test('sync completes within reasonable time', async ({ page, context }) => {
     // 1. Create 10 unsynced results
     // 2. Measure sync duration
     // 3. Assert < 5 seconds
   });
   ```

### Phase 4: Debugging & Reliability

**Common Issues & Solutions:**

1. **Timing Issues:**
   - Use `expect.poll()` instead of fixed `waitForTimeout()`
   - Add explicit wait conditions for sync completion
   - Log sync state transitions for debugging

2. **IndexedDB Access:**
   - Current raw IndexedDB approach works but is verbose
   - Consider exposing Dexie instance more reliably
   - Add retry logic for database queries

3. **Network Interception:**
   - Verify routes are set up before navigation
   - Check that service workers aren't interfering
   - Log all intercepted requests for debugging

**Debugging Utilities:**

Add to `tests/e2e/helpers/debug.ts`:
```typescript
export async function logSyncState(page: Page): Promise<void> {
  const results = await getResultsBySyncStatus(page, 0);
  const synced = await getResultsBySyncStatus(page, 1);
  console.log(`[DEBUG] Unsynced: ${results.length}, Synced: ${synced.length}`);
}

export async function waitForSyncComplete(
  page: Page,
  expectedUnsynced: number = 0,
  timeout: number = 15000
): Promise<void> {
  await expect.poll(
    async () => {
      const unsynced = await getResultsBySyncStatus(page, 0);
      return unsynced.length;
    },
    { timeout }
  ).toBe(expectedUnsynced);
}
```

---

## 🧪 Testing Strategy

### Local Development

1. **Run tests in headed mode for debugging:**
   ```bash
   npm run test:e2e -- --headed
   ```

2. **Run specific test:**
   ```bash
   npm run test:e2e -- offline-sync.spec.ts -g "saves quiz results"
   ```

3. **Debug with Playwright Inspector:**
   ```bash
   PWDEBUG=1 npm run test:e2e
   ```

### CI/CD Integration

1. **Add to `.github/workflows/ci.yml`:**
   ```yaml
   e2e:
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
           node-version: 22
       - run: npm ci
       - run: npx playwright install --with-deps chromium
       - run: npm run test:e2e
         env:
           E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
           E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
           NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
           NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
   ```

---

## 📊 Success Criteria

### Must Have (MVP)
- [ ] At least one test verifies `synced: 0` → `synced: 1` transition
- [ ] Network request verification confirms POST to `/rest/v1/results`
- [ ] Payload structure matches expected format
- [ ] Tests pass consistently (3+ runs)

### Should Have
- [ ] Multiple results batch sync test
- [ ] Sync failure recovery test
- [ ] Performance benchmark test
- [ ] CI/CD integration

### Nice to Have
- [ ] Visual regression tests for offline UI
- [ ] Network throttling tests (slow 3G simulation)
- [ ] Cross-browser testing (Firefox, WebKit)

---

## 🔍 Key Files Reference

### Critical Files to Understand

1. **`src/hooks/useSync.ts`** - Entry point for sync logic
2. **`src/lib/sync/syncManager.ts`** - Core sync implementation
3. **`src/components/providers/AuthProvider.tsx`** - Auth state management
4. **`src/lib/supabase/client.ts`** - Supabase client creation
5. **`tests/e2e/fixtures/index.ts`** - Test fixture setup

### Key Functions

- `syncResults(userId)` - Pushes unsynced results to Supabase
- `getResultsBySyncStatus(page, 0|1)` - Query IndexedDB by sync status
- `injectAuthState(page)` - Set up mock authentication
- `setupSupabaseMocks(context, syncRequests)` - Intercept API calls

---

## 🚨 Known Limitations & Workarounds

1. **Service Workers:** Blocked in config (`serviceWorkers: 'block'`) to prevent interference with network mocking
2. **IndexedDB Security:** Can't access IndexedDB from `about:blank` - always navigate to valid origin first
3. **Auth Token Validation:** Supabase SDK validates JWT signatures - mock tokens won't work without deep mocking
4. **Sync Timing:** `useSync` runs on mount - may need explicit trigger for tests

---

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Supabase JS SDK](https://supabase.com/docs/reference/javascript/introduction)
- [Dexie.js Documentation](https://dexie.org/)
- [Next.js Testing Guide](https://nextjs.org/docs/app/building-your-application/testing)

---

## 🎯 Quick Start Checklist

For the engineer picking this up:

- [ ] Read this entire document
- [ ] Review `tests/e2e/offline-sync.spec.ts` to understand current tests
- [ ] Run existing tests: `npm run test:e2e`
- [ ] Choose authentication approach (Option A recommended)
- [ ] Implement Phase 1 (Authentication)
- [ ] Verify sync triggers with `expect.poll()`
- [ ] Implement Phase 2 (Enhanced Verification)
- [ ] Add Phase 3 test cases
- [ ] Run full suite 3x to verify determinism
- [ ] Update this document with any new findings

---

## 💡 Tips & Tricks

1. **Use Playwright's trace viewer:**
   ```bash
   npm run test:e2e -- --trace on
   npx playwright show-trace trace.zip
   ```

2. **Screenshot on failure (already configured):**
   - Screenshots saved to `test-results/`

3. **Network request logging:**
   ```typescript
   page.on('request', request => {
     if (request.url().includes('supabase')) {
       console.log('→', request.method(), request.url());
     }
   });
   ```

4. **Database state inspection:**
   ```typescript
   // In test, pause and inspect:
   await page.pause();
   // Opens Playwright Inspector - can run evaluate() commands
   ```

---

## 📝 Notes from Initial Implementation

- **Why raw IndexedDB?** Dexie exposure on `window` was unreliable across page navigations
- **Why guest user ID?** App uses `useEffectiveUserId` which falls back to guest ID when no auth
- **Why simplified tests?** Full sync verification requires real auth or very complex mocking
- **Current approach works for:** Verifying offline data persistence (the critical "data is safe" requirement)

---

**Last Updated:** 2025-01-XX  
**Status:** Infrastructure complete, sync verification pending  
**Next Steps:** Implement Phase 1 (Authentication) using Option A (Real Test User)

