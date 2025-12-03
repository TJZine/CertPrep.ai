import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

function isAllowedHost(host: string): boolean {
  const allowedHosts =
    process.env.ALLOWED_HOSTS?.split(",")
      .map((h) => h.trim())
      .filter(Boolean) ?? [];
  return allowedHosts.some((allowed) => {
    return (
      host === allowed ||
      host === `www.${allowed}` ||
      (host.endsWith(`.${allowed}`) &&
        host[host.length - allowed.length - 1] === ".")
    );
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Validate 'next' param to prevent open redirects
  let next = searchParams.get("next") ?? "/";

  try {
    // 1. Decode URI component to handle encoded attacks (e.g. %2f)
    const decodedNext = decodeURIComponent(next);

    // 2. Strip leading/trailing whitespace and control characters
    const sanitizedNext = decodedNext.trim().replace(/[\x00-\x1F\x7F]/g, "");

    // 3. Reject if it contains backslashes (often used to bypass / checks)
    if (sanitizedNext.includes("\\")) {
      next = "/";
    }
    // 4. Reject if it contains a scheme (e.g. javascript:, data:, https:)
    // A scheme is defined as characters followed by a colon before any slash
    else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(sanitizedNext)) {
      next = "/";
    }
    // 5. Ensure it starts with a single '/' and is not a protocol-relative URL (//)
    else if (!sanitizedNext.startsWith("/") || sanitizedNext.startsWith("//")) {
      next = "/";
    } else {
      // If all checks pass, use the sanitized value
      next = sanitizedNext;
    }
  } catch {
    // If decoding fails, default to root
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost && isAllowedHost(forwardedHost)) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      logger.error("Auth exchange failed", { error, code: "REDACTED" });
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/login?error=Could not authenticate user`,
  );
}
