import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export const createClient = async (): Promise<ReturnType<typeof createServerClient>> => {
  const cookieStore = await cookies()

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

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
    // Fallback to prevent build crash
    logger.error('Failed to create Supabase server client', { error })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createServerClient('https://placeholder.supabase.co', 'placeholder-key', { cookies: {} as any })
  }
}
