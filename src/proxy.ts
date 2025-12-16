import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { buildCSPHeader } from "@/lib/security";

const PROTECTED_ROUTES = ["/settings"];
// Retained to prevent open redirects; server-side redirect logic (lines 147+) temporarily disabled
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // 1. Generate Nonce for CSP
  const nonce = crypto.randomUUID();

  // 2. Prepare CSP Header
  const isDev = process.env.NODE_ENV === "development";
  const contentSecurityPolicyHeaderValue = buildCSPHeader(nonce, isDev);

  // 3. Initialize Response with Headers ONCE
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicyHeaderValue,
  );

  // 4. Supabase Client
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrlEnv || !supabaseKey) {
    const errorMsg =
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY). Application cannot function safely.";
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const urlToUse = supabaseUrlEnv.startsWith("http")
    ? supabaseUrlEnv
    : `https://${supabaseUrlEnv}`;
  const keyToUse = supabaseKey;

  const supabase = createServerClient(urlToUse, keyToUse, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // MUTATE existing response, don't destroy it
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value); // Update req for current processing
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: options?.sameSite ?? "lax",
          });
        });
      },
    },
  });

  // 5. Auth Logic
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    logger.error(
      "Middleware auth check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // Default to unauthenticated
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );


  // Unauthenticated users trying to access protected routes -> Redirect to Login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);

    // Validate 'next' param to prevent loops and open redirects
    const nextPath = request.nextUrl.pathname + request.nextUrl.search;
    if (
      nextPath.startsWith("/") &&
      !nextPath.startsWith("//") &&
      !AUTH_ROUTES.some((r) => nextPath.startsWith(r)) &&
      !nextPath.includes("://")
    ) {
      redirectUrl.searchParams.set("next", nextPath);
    }

    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Copy cookies from the main response to the redirect response
    const cookies = response.cookies.getAll();
    cookies.forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  // Authenticated users trying to access auth routes -> Redirect to Dashboard
  // TODO: Re-enable server-side redirects once we verify robust client/server session sync.
  // Current Issue: Server cookie may be valid while client state is stale, causing infinite loops.
  // Requirement for Re-enabling: Ensure client's session state (AuthProvider) matches server cookie < 500ms.
  // Tracked in Issue: #123 (Server-Side Redirect Optimization)
  /*
  if (isAuthRoute && user) {
    const redirectUrl = new URL("/", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);

    // Copy cookies from the main response to the redirect response
    const cookies = response.cookies.getAll();
    cookies.forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }
  */

  return response;
}

// Default export for Next.js to pick it up easily
export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
