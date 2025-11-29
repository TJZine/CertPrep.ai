# hCaptcha Setup Guide

## 1. Local Development Setup

To test hCaptcha on `localhost`, you have two options:

### Option A: Use your Production/Real Keys (Recommended)
hCaptcha allows you to use your real Site Key and Secret Key on localhost.

1.  Log in to your [hCaptcha Dashboard](https://dashboard.hcaptcha.com/).
2.  Select your site (or create a new one).
3.  Go to **Settings** > **Domains**.
4.  Add the following domains:
    *   `localhost`
    *   `127.0.0.1`
5.  Click **Save**.
6.  Copy your **Site Key** to `.env.local`:
    ```bash
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your-real-site-key
    ```

### Option B: Use Test Keys
If you don't want to configure a dashboard yet, you can use the official hCaptcha test keys.

**Note:** If you are using Supabase Auth with hCaptcha enabled, Supabase expects a valid secret key. Using test keys on the client might fail validation if Supabase is configured with a real secret key.

*   **Test Site Key:** `10000000-ffff-ffff-ffff-000000000001`
*   **Test Secret Key:** `0x0000000000000000000000000000000000000000`

## 2. Supabase Configuration

To enable hCaptcha protection for Auth:

1.  Go to Supabase Dashboard > **Project Settings** > **Authentication**.
2.  Enable **Enable Captcha Protection**.
3.  Select **hCaptcha**.
4.  Enter your **hCaptcha Site Key** and **Secret Key** (from the hCaptcha dashboard).
5.  Save.

## 3. Troubleshooting

### "Missing sitekey" Error
Ensure `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is defined in your `.env.local` file.

### "Hydration failed" or UI Mismatches
Browser extensions (like password managers or ad blockers) can sometimes inject HTML that interferes with React's hydration. Try testing in an Incognito window to rule this out.

### "Invalid Captcha" during Signup
If using Test Keys on the client but Real Keys on Supabase, signup will fail. Ensure both the Client (`.env.local`) and the Server (Supabase Dashboard) use a matching pair of keys (either both Real or both Test).
