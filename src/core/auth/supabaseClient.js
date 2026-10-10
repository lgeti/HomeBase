import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabase)

// Opening a password-reset link makes the client emit PASSWORD_RECOVERY once while it starts up, which can
// happen before React subscribes. Listen from the moment the client exists and keep the result for useAuth.
let isPasswordRecovery = false
const passwordRecoveryListeners = new Set()

supabase?.auth.onAuthStateChange((event) => {
  if (event !== 'PASSWORD_RECOVERY') return
  isPasswordRecovery = true
  passwordRecoveryListeners.forEach((listener) => listener())
})

export const hasPendingPasswordRecovery = () => isPasswordRecovery

export const onPasswordRecovery = (listener) => {
  passwordRecoveryListeners.add(listener)
  return () => passwordRecoveryListeners.delete(listener)
}

export const finishPasswordRecovery = () => {
  isPasswordRecovery = false
}