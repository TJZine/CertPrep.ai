import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

export const createClient = (): ReturnType<typeof createBrowserClient> => {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

  if (!supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseKey)
  } catch (error) {
    logger.warn('Failed to create Supabase client, using fallback.', error)
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }
}
