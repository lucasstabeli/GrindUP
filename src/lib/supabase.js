import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Singleton: prevent multiple client instances (which cause lock-stealing errors
// like "Lock 'lock:sb-...-auth-token' was released because another request stole it")
const globalForSupabase = globalThis
export const supabase =
  globalForSupabase.__grindupSupabase ||
  (globalForSupabase.__grindupSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'sb-nsulytykxasagcjwdetv-auth-token',
      // Disable the web-lock based auth refresh which fights with itself
      // in PWA standalone mode on iOS. We just queue refreshes ourselves.
      lock: async (_name, _timeout, fn) => fn(),
    },
  }))
