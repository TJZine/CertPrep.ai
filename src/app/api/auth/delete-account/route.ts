import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";

const originCandidates = [
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
];

if (
  process.env.NEXT_PUBLIC_PRODUCTION_URL &&
  process.env.NODE_ENV === "production"
) {
  originCandidates.push(process.env.NEXT_PUBLIC_PRODUCTION_URL);
}

const allowedOrigins = new Set(originCandidates.filter(Boolean));

function isAllowedOrigin(
  originHeader: string | null,
  requestOrigin: string,
): boolean {
  if (!originHeader) return false;
  try {
    const origin = new URL(originHeader).origin;
    if (origin === requestOrigin) return true;
    return allowedOrigins.has(origin);
  } catch {
    return false;
  }
}

function isSameSiteRequest(request: NextRequest): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  return (
    fetchSite === null ||
    fetchSite === "same-origin" ||
    fetchSite === "none" ||
    fetchSite === "same-site"
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // SECURITY: DELETE requests should have no body per HTTP semantics
    // Reject any body (>0 bytes) or malformed content-length headers to prevent DoS
    const contentLength = request.headers.get("content-length");
    if (contentLength !== null) {
      const length = parseInt(contentLength, 10);
      // Reject if: body present (>0), or header is malformed (NaN)
      if (!Number.isFinite(length) || length > 0) {
        return NextResponse.json(
          { error: "Request body not allowed" },
          { status: 413 }
        );
      }
    }

    const cookieStore = await cookies();
    const requestOrigin = request.nextUrl.origin;

    if (
      !isSameSiteRequest(request) ||
      !isAllowedOrigin(request.headers.get("origin"), requestOrigin)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Verify Session
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error("Missing Supabase env vars for delete-account route", {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (!supabaseUrl.startsWith("http")) {
      supabaseUrl = `https://${supabaseUrl}`;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Initialize Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      logger.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Sign out user first (invalidates all sessions)
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "global",
    });
    if (signOutError) {
      logger.error("Error signing out before account deletion", signOutError);
      return NextResponse.json(
        { error: "Failed to clear session before deletion" },
        { status: 500 },
      );
    }

    logger.info("Initiating account deletion for user", { userId: user.id });

    // Delete user - ON DELETE CASCADE in schema automatically deletes:
    // - profiles (id references auth.users)
    // - quizzes (user_id references auth.users)
    // - results (user_id references auth.users)
    // - srs (user_id references auth.users)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (error) {
      logger.error("Error deleting user via service role", error);
      return NextResponse.json(
        { error: "Failed to delete account. Please try again or contact support." },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ success: true });

    // Explicitly delete all cookies to ensure a clean slate
    cookieStore.getAll().forEach((cookie) => {
      response.cookies.delete(cookie.name);
    });

    return response;
  } catch (error) {
    logger.error("Unexpected error in delete-account", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
