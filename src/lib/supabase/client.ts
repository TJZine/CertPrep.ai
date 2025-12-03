import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export const createClient = (): SupabaseClient | undefined => {
  if (client) return client

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    if (!supabaseUrl || !supabaseKey) {
      // In development, this might be fine if mocking, but in prod it's critical.
      // We log it but don't throw to avoid white-screen loop if possible,
      // though the app won't work well.
      logger.error('Missing Supabase environment variables.')
      return undefined
    }

    if (supabaseUrl && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}`
    }

    client = createBrowserClient(supabaseUrl, supabaseKey)
    return client
  } catch (error) {
    logger.error('Failed to create Supabase client.', error)
    return undefined
  }
}
