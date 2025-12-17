export function buildCSPHeader(nonce: string, isDev: boolean): string {
  // Note: 'unsafe-inline' is safe for styles (no script execution risk)
  // and is industry standard practice (used by Google, GitHub, etc.)
  const styleSrc = `'self' 'unsafe-inline' 'nonce-${nonce}' https://hcaptcha.com https://*.hcaptcha.com`;

  // Hash for static inline scripts that need to bypass nonce (due to SSR caching)
  // SW registration script with logging
  const swScriptHash = "'sha256-/HheWjfhkeyEm4+cLgh+I7R9hG92MxVLic+LWs+oSMI='";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${swScriptHash} ${isDev ? "'unsafe-eval'" : ""} https://js.hcaptcha.com https://*.hcaptcha.com https://*.sentry.io https://va.vercel-scripts.com;
    style-src ${styleSrc};
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self';
    frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://sentry.io https://browser.sentry-cdn.com;
    upgrade-insecure-requests;
    connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || ""} ${process.env.NEXT_PUBLIC_SUPABASE_URL && URL.canParse(process.env.NEXT_PUBLIC_SUPABASE_URL)
      ? `wss://${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname}`
      : ""
    } *.sentry.io https://hcaptcha.com https://*.hcaptcha.com https://browser.sentry-cdn.com https://vitals.vercel-insights.com;
    worker-src 'self' blob:;
  `;

  return cspHeader.replace(/\s{2,}/g, " ").trim();
}
