# hCaptcha Setup Guide

## 1. Local Development Setup

To test hCaptcha on `localhost`, you have two options:

### Option A: Use Test Keys (Recommended for Localhost)
hCaptcha's dashboard validation can be tricky with `localhost`. The easiest way to unblock development is to use the official Test Keys. These always work on localhost and always pass validation.

**Important:** When you deploy to production, you **must** switch to real keys.

1.  Update your `.env.local` file:
    ```bash
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
    ```
    *(Note: The secret key is configured in Supabase, see Section 2 below)*

### Option B: Use Real Keys
If you must use real keys locally:
1.  Log in to your hCaptcha Dashboard.
2.  Go to **Settings**.
3.  **Do not** add `localhost` to the domain list (it often throws an error).
4.  Instead, look for a "Disable Domain Checking" option and enable it temporarily.
5.  Or, try adding `127.0.0.1` if `localhost` is rejected.

## 2. Supabase Configuration

To enable hCaptcha protection for Auth:

1.  Go to Supabase Dashboard > **Project Settings** > **Authentication**.
2.  Enable **Enable Captcha Protection**.
3.  Select **hCaptcha**.
4.  **If using Test Keys (Option A):**
    *   Site Key: `10000000-ffff-ffff-ffff-000000000001`
    *   Secret Key: `0x0000000000000000000000000000000000000000`
5.  **If using Real Keys (Option B):**
    *   Enter your actual Site Key and Secret Key.
6.  Save.

**Security Note:** If you use Test Keys in Supabase, **anyone** can bypass your captcha on production. **NEVER** leave Test Keys active in your production Supabase project.

## 3. Troubleshooting

### "Missing sitekey" Error
Ensure `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is defined in your `.env.local` file.

### "Hydration failed" or UI Mismatches
Browser extensions can interfere. Test in Incognito.

### "Invalid Captcha" during Signup
This happens if your Client (Next.js) and Server (Supabase) keys don't match.
*   Client uses Test Key + Supabase uses Real Key -> **FAIL**
*   Client uses Real Key + Supabase uses Test Key -> **FAIL**
*   **Both** must use the same pair.