/**
 * Browser-side Supabase client using @supabase/ssr createBrowserClient.
 *
 * IMPORTANT: Use this in 'use client' components instead of createClient
 * from @supabase/supabase-js. createBrowserClient stores the session in
 * cookies (not localStorage), which middleware can read server-side.
 * Using createClient would cause auth loops and broken PKCE callbacks.
 *
 * Singleton pattern: createBrowserClient returns the same instance on
 * repeated calls in the same browser context.
 */
import { createBrowserClient } from '@supabase/ssr'
import { getFilmRoomConfig } from './filmroom-config'

export function getSupabaseBrowser() {
  const { url, anonKey } = getFilmRoomConfig()
  return createBrowserClient(url, anonKey)
}
