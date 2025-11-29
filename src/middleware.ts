import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/quiz', '/results', '/library', '/settings', '/analytics']
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // 1. Generate Nonce for CSP
  const nonce = crypto.randomUUID()
  
  // 2. Prepare CSP Header
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let supabaseHostname = ''
  try {
    if (supabaseUrl) {
      supabaseHostname = new URL(supabaseUrl).hostname
    }
  } catch {
    // Ignore invalid URL
  }

  const isDev = process.env.NODE_ENV === 'development'
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ''} https://js.hcaptcha.com https://*.hcaptcha.com https://*.sentry.io;
    style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com;
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'self' https://hcaptcha.com https://*.hcaptcha.com;
    frame-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://sentry.io https://browser.sentry-cdn.com;
    block-all-mixed-content;
    upgrade-insecure-requests;
    connect-src 'self' ${supabaseUrl} ${supabaseHostname ? `wss://${supabaseHostname}` : ''} *.sentry.io https://hcaptcha.com https://*.hcaptcha.com https://browser.sentry-cdn.com;
    worker-src 'self' blob:;
  `
  // Replace newlines with spaces
  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim()

  // 3. Initialize Response with Headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)

  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabaseUrlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!supabaseUrlEnv || !supabaseKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing Supabase environment variables in production')
    } else {
      console.warn('Missing Supabase environment variables, using placeholder')
    }
  }

  let urlToUse = supabaseUrlEnv || 'https://placeholder.supabase.co'

  if (!urlToUse.startsWith('http')) {
    urlToUse = `https://${urlToUse}`
  }

  const supabase = createServerClient(
    urlToUse,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          
          response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
          
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
              secure: process.env.NODE_ENV === 'production',
              httpOnly: true,
              sameSite: 'lax',
            })
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some((route) => request.nextUrl.pathname.startsWith(route))

  // 1. Unauthenticated users trying to access protected routes -> Redirect to Login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 2. Authenticated users trying to access auth routes (login/signup) -> Redirect to Dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
