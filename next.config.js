/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// FINDING-004: Strict Environment Validation
// Only enforce on actual production deployments, not local builds or CI.
// - VERCEL_ENV: Set by Vercel to 'production', 'preview', or 'development'
// - ENFORCE_ENV_VALIDATION: Custom flag for non-Vercel production deployments
const isProductionDeployment =
  process.env.VERCEL_ENV === "production" ||
  process.env.ENFORCE_ENV_VALIDATION === "true";

if (isProductionDeployment) {
  const requiredEnvs = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

  if (missingEnvs.length > 0) {
    throw new Error(
      `Production deployment failed: Missing required environment variables: ${missingEnvs.join(", ")}`,
    );
  }
}

const pkg = require("./package.json");

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for static export or offline capability if needed
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // CSP is now handled in proxy.ts to support Nonce-based strict mode
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "tjzine",
    project: "cert-prep-ai",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Bundle size optimizations (replaces deprecated disableLogger)
    bundleSizeOptimizations: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      excludeDebugStatements: true,
      // Exclude tracing instrumentation for smaller bundle (only if not using performance monitoring)
      // excludeTracing: true,
    },

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    // NOTE: This feature is marked as deprecated but no migration path exists yet.
    // Keeping it enabled until Sentry provides the new API.
    automaticVercelMonitors: true,
  })
);
