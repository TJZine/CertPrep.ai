import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  generateRecoveryProofNonce,
  RECOVERY_PROOF_COOKIE_NAME,
  RECOVERY_PROOF_COOKIE_PATH,
  RECOVERY_PROOF_MAX_AGE_SECONDS,
  serializeRecoveryProof,
} from "@/lib/auth/recoveryProof";

function stripControlCharacters(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code > 0x1f && code !== 0x7f) {
      result += char;
    }
  }
  return result;
}

function normalizeHost(rawHost: string | null): string | null {
  if (!rawHost) return null;
  try {
    const url = new URL(`http://${rawHost.trim()}`);
    return url.hostname.toLowerCase();
  } catch {
    // Malformed host, treat as untrusted
    return null;
  }
}

function isAllowedHost(host: string | null): boolean {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) return false;
  const allowedHosts =
    process.env.ALLOWED_HOSTS?.split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return allowedHosts.some((allowed) => {
    return (
      normalizedHost === allowed ||
      normalizedHost === `www.${allowed}` ||
      (normalizedHost.endsWith(`.${allowed}`) &&
        normalizedHost[normalizedHost.length - allowed.length - 1] === ".")
    );
  });
}

function prepareRecoveryRedirect(
  path: string,
  origin: string,
  recoveryUserId: string | null,
): { path: string; proof: string | null } {
  const target = new URL(path, origin);
  let proof: string | null = null;

  // Recovery proof is callback-owned. Never trust a nonce supplied by `next`.
  target.searchParams.delete("recovery");
  if (recoveryUserId && target.pathname === RECOVERY_PROOF_COOKIE_PATH) {
    const nonce = generateRecoveryProofNonce();
    proof = serializeRecoveryProof({
      nonce,
      userId: recoveryUserId,
    });
    target.searchParams.set("recovery", nonce);
  }

  return {
    path: `${target.pathname}${target.search}${target.hash}`,
    proof,
  };
}

function createRedirectResponse(
  destination: string,
  proof: string | null,
): NextResponse {
  const response = NextResponse.redirect(destination);
  if (proof) {
    response.cookies.set(RECOVERY_PROOF_COOKIE_NAME, proof, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: RECOVERY_PROOF_COOKIE_PATH,
      maxAge: RECOVERY_PROOF_MAX_AGE_SECONDS,
    });
  }
  return response;
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
    const sanitizedNext = stripControlCharacters(decodedNext.trim());

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

  next = prepareRecoveryRedirect(next, origin, null).path;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // auth-js 2.110.7 returns this PKCE provenance at runtime, although the
      // public AuthTokenResponse type currently omits it.
      const redirectType = (
        data as typeof data & { redirectType?: string | null }
      ).redirectType;
      const verifiedRedirect = prepareRecoveryRedirect(
        next,
        origin,
        redirectType === "recovery" ? data.user.id : null,
      );
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return createRedirectResponse(
          `${origin}${verifiedRedirect.path}`,
          verifiedRedirect.proof,
        );
      } else if (forwardedHost && isAllowedHost(forwardedHost)) {
        return createRedirectResponse(
          `https://${forwardedHost}${verifiedRedirect.path}`,
          verifiedRedirect.proof,
        );
      } else {
        return createRedirectResponse(
          `${origin}${verifiedRedirect.path}`,
          verifiedRedirect.proof,
        );
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
