import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export const createClient = async (): Promise<ReturnType<typeof createServerClient>> => {
  const cookieStore = await cookies()

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error('Missing Supabase environment variables')
    }
    // In production, we'll handle this gracefully below or let createServerClient fail if it must,
    // but typically we want to return a safe fallback to prevent crashes.
    // However, without a URL, we can't really do anything.
    // Let's use a safe fallback URL if missing in prod to prevent immediate crash, 
    // but operations will fail.
    supabaseUrl = supabaseUrl || 'https://placeholder.supabase.co'
    supabaseKey = supabaseKey || 'placeholder-key'
  }

  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`
  }

  try {
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({
                name,
                value,
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              })
            } catch {
              // The `cookies().set()` method can only be called in a Server Component or Route Handler.
              // This error `cookies().set()` will cause when called from a Client Component.
              // console.warn('Could not set cookie from Server Client:', error)
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({
                name,
                value: '',
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
              })
            } catch {
              // console.warn('Could not remove cookie from Server Client:', error)
            }
          },
        },
      }
    )
  } catch (error) {
    // Re-throw in development for immediate feedback
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
    // In production, return fallback to prevent crash (will fail on actual operations)
    logger.warn('Using fallback Supabase client - auth operations will fail')
    return createServerClient('https://placeholder.supabase.co', 'placeholder-key', { cookies: {} as unknown as Parameters<typeof createServerClient>[2]['cookies'] })
  }
}
