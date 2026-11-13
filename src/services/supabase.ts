import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { envConfig, integrationStatus } from '@/config/env'

let supabaseInstance: SupabaseClient | null = null

/**
 * Returns a singleton instance of the Supabase client when configured,
 * or null when operating in local mock / offline mode.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance

  const url = envConfig.supabase.url
  const anonKey = envConfig.supabase.anonKey

  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err)
      supabaseInstance = null
    }
  }

  return supabaseInstance
}

export const isSupabaseConnected = (): boolean => {
  return Boolean(integrationStatus.supabase && getSupabaseClient() !== null)
}
