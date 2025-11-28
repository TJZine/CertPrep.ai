/** @type {import('next').NextConfig} */

// FINDING-004: Strict Environment Validation
if (process.env.NODE_ENV === 'production') {
  const requiredEnvs = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

  if (missingEnvs.length > 0) {
    throw new Error(
      `Production build failed: Missing required environment variables: ${missingEnvs.join(', ')}`
    );
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Required for static export or offline capability if needed
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // CSP is now handled in middleware.ts to support Nonce-based strict mode
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
