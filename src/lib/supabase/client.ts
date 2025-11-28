import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

export const createClient = (): ReturnType<typeof createBrowserClient> => {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    // In production, we log an error. The client creation will likely fail or return a non-functional client,
    // but we shouldn't use a hardcoded placeholder that masks the configuration issue.
    logger.error('Missing Supabase environment variables in production.')
  }

  // Fallback to empty string if undefined to satisfy types, but it won't work (which is intended if config is missing)
  const url = supabaseUrl || ''
  const key = supabaseKey || ''

  if (url && !url.startsWith('http')) {
    supabaseUrl = `https://${url}`
  }

  try {
    return createBrowserClient(supabaseUrl || url, key)
  } catch (error) {
    logger.error('Failed to create Supabase client.', error)
    throw error
  }
}
