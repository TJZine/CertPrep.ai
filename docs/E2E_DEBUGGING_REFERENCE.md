# E2E Debugging Reference

## Authentication Flow Debugging

When debugging `tests/e2e/global-setup.ts`, the following debug logs were useful for tracing the Supabase Magic Link injection flow.

### Global Setup Logs (tests/e2e/global-setup.ts)

To enable detailed logging of the auth flow, add these `console.log` statements back into `globalSetup`:

```typescript
// 1. Check Supabase URL
// eslint-disable-next-line no-console
console.log('GlobalSetup Supabase URL:', supabaseUrl);

// 2. User Creation/Update
// eslint-disable-next-line no-console
console.log('Creating E2E test user...');
// or
// eslint-disable-next-line no-console
console.log('Updating E2E test user password...');

// 3. Magic Link Generation
// eslint-disable-next-line no-console
console.log('Generating magic link for E2E login...');

// 4. Token Extraction
// eslint-disable-next-line no-console
console.log('Magic link generated. Fetching to extract tokens...');
// eslint-disable-next-line no-console
console.log('Redirect location obtained. Extracting tokens...');
// eslint-disable-next-line no-console
console.log('Tokens extracted. Injecting into browser...');
// eslint-disable-next-line no-console
console.log('Access Token Length:', access_token.length);

// 5. Payload Verification
// eslint-disable-next-line no-console
console.log('Token Payload sub:', payload.sub);
```

### Browser & Cookie Logs (tests/e2e/fixtures/auth.ts)

To debug cookie injection in `injectAuthState`:

```typescript
// Debug: Check cookies
const cookies = await page.evaluate(() => document.cookie);
// eslint-disable-next-line no-console
console.log(`Injecting auth for user: ${MOCK_USER.email}`);
// eslint-disable-next-line no-console
console.log('injectAuthState: Cookies:', cookies);
```

### Browser Console Forwarding

To see browser console logs in your terminal during test execution, ensure this listener is active in `globalSetup`:

```typescript
// Debug: Forward browser logs to terminal
// eslint-disable-next-line no-console
page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
page.on('pageerror', err => console.error(`BROWSER ERROR: ${err}`));
```
