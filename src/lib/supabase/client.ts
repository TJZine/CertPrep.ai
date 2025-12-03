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
      const message = 'Missing Supabase environment variables.'
      logger.error(message)
      // Surface hard failure in production to avoid silent auth breakage.
      if (process.env.NODE_ENV === 'production') {
        throw new Error(message)
      }
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
