import { chromium, FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Helper to decode JWT payload safely
function decodeJwtPayload(token: string): Record<string, unknown> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new Error("Invalid JWT format");
  }
  const padding = "=".repeat((4 - (payload.length % 4)) % 4);
  const base64 = (payload + padding).replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(base64, "base64").toString());
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = "e2e-test@certprep.local";
  const testPassword = "TestPassword123!";

  // 1. Check if user exists, create if not
  const {
    data: { users },
    error: listError,
  } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  let userId = users.find((u) => u.email === testEmail)?.id;

  if (userId) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        password: testPassword,
        email_confirm: true,
      },
    );
    if (updateError) throw updateError;
  } else {
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    if (createError) throw createError;
    userId = data.user.id;
  }

  // Use baseURL from config or default to localhost:3000
  const baseURL = config.projects?.[0]?.use?.baseURL || "http://localhost:3000";

  // 2. UI Login via Magic Link (Manual Session Injection)
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: testEmail,
      options: {
        redirectTo: `${baseURL}/`,
      },
    });

  if (linkError) throw linkError;
  if (!linkData.properties?.action_link)
    throw new Error("Failed to generate magic link");

  const magicLink = linkData.properties.action_link;

  // Fetch the magic link to get the redirect URL with tokens
  const response = await fetch(magicLink, { redirect: "manual" });
  const location = response.headers.get("location");

  if (!location) {
    throw new Error("Magic link did not redirect as expected");
  }

  const hash = location.split("#")[1];
  if (!hash) {
    throw new Error("Redirect location does not contain hash fragment");
  }

  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (!access_token || !refresh_token) {
    throw new Error("Failed to extract tokens from hash");
  }

  try {
    decodeJwtPayload(access_token);
    // Verification implies it didn't throw
  } catch (e) {
    console.error("Failed to decode token payload:", e);
  }

  const browser = await chromium.launch({
    args: ["--disable-web-security"],
  });
  const page = await browser.newPage();

  try {
    // Construct session object
    const payload = decodeJwtPayload(access_token);

    const session = {
      access_token,
      refresh_token,
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: {
        id: payload.sub,
        aud: payload.aud,
        email: payload.email,
        role: payload.role,
        app_metadata: payload.app_metadata,
        user_metadata: payload.user_metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Set cookie directly
    // Cookie name format: sb-<project-ref>-auth-token
    // Project ref is in the Supabase URL: https://<ref>.supabase.co
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
      /https:\/\/([^.]+)\.supabase\.co/,
    )?.[1];
    if (!projectRef)
      throw new Error(
        "Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL",
      );

    const cookieName = `sb-${projectRef}-auth-token`;

    // Let's try to set it as a raw JSON string first (URI encoded).
    const cookieValueJson = JSON.stringify(session);
    const cookieValueBase64 = Buffer.from(cookieValueJson).toString("base64");

    // Let's try setting it via context.addCookies
    await page.context().addCookies([
      {
        name: cookieName,
        value: `base64-${cookieValueBase64}`, // Try this format first
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Navigate to home page
    await page.goto(`${baseURL}/`);

    // Wait for client-side auth to complete and cookies to be set
    // We check for the user email in the header
    await page
      .getByText(testEmail)
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    // Ensure auth directory exists
    const authDir = path.join(__dirname, ".auth");
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir);
    }

    // 3. Save storage state (cookies + localStorage)
    await page
      .context()
      .storageState({ path: path.join(authDir, "user.json") });

    // 4. Save user ID for fixtures
    fs.writeFileSync(
      path.join(authDir, "user-id.json"),
      JSON.stringify({ id: userId }, null, 2),
    );
  } catch (error) {
    console.error("UI Login failed:", error);
    // Capture screenshot on failure if possible, though we might not see it easily in this env
    try {
      await page.screenshot({ path: "login-failure.png" });
    } catch (e) {
      console.error("Failed to take screenshot:", e);
    }
    throw error;
  } finally {
    await browser.close();
  }
}
