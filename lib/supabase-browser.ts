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

export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
