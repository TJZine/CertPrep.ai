import { createServerClient, type CookieOptions } from '@supabase/ssr'
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
  } catch (e) {
    // Ignore invalid URL
  }

  const isDev = process.env.NODE_ENV === 'development'
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
    connect-src 'self' ${supabaseUrl} ${supabaseHostname ? `wss://${supabaseHostname}` : ''} *.sentry.io;
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

  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  let urlToUse = supabaseUrl || 'https://placeholder.supabase.co'

  if (!urlToUse.startsWith('http')) {
    urlToUse = `https://${urlToUse}`
  }

  let supabase
  try {
    supabase = createServerClient(
      urlToUse,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
            // Re-apply CSP header to the new response object
            response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: requestHeaders,
              },
            })
             // Re-apply CSP header to the new response object
            response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue)
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
  } catch {
    // Fallback for build resilience
    supabase = createServerClient('https://placeholder.supabase.co', 'placeholder-key', { cookies: {} as any })
  }

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
