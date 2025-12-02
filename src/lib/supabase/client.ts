import { createBrowserClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

let client: ReturnType<typeof createBrowserClient> | undefined

export const createClient = (): ReturnType<typeof createBrowserClient> => {
  if (client) return client

  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required')
  }

  if (supabaseUrl && !supabaseUrl.startsWith('http')) {
    supabaseUrl = `https://${supabaseUrl}`
  }

  try {
    client = createBrowserClient(supabaseUrl, supabaseKey)
    return client
  } catch (error) {
    logger.error('Failed to create Supabase client.', error)
    throw error
  }
}
