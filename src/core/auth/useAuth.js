import { useEffect, useState } from 'react'
import {
  finishPasswordRecovery,
  hasPendingPasswordRecovery,
  isSupabaseConfigured,
  onPasswordRecovery,
  supabase,
} from './supabaseClient'

// Where Supabase sends people back to after Google sign-in or a password-reset email
const authRedirectUrl = () => import.meta.env.VITE_AUTH_REDIRECT_URL
  || `${window.location.origin}${import.meta.env.BASE_URL}`

export const useAuth = () => {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  // True after opening a password-reset link, until a new password is saved
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(hasPendingPasswordRecovery)

  useEffect(() => {
    if (hasPendingPasswordRecovery()) setIsRecoveringPassword(true)
    return onPasswordRecovery(() => setIsRecoveringPassword(true))
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false)
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session)
        setIsLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    if (!supabase) throw new Error('Supabase Auth is not configured')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })

    if (error) throw error
  }

  const signInWithPassword = async (email, password) => {
    if (!supabase) throw new Error('Supabase Auth is not configured')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithPassword = async (email, password) => {
    if (!supabase) throw new Error('Supabase Auth is not configured')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  // Emails a reset link. The link must be opened in this browser (PKCE keeps a secret here).
  const sendPasswordReset = async (email) => {
    if (!supabase) throw new Error('Supabase Auth is not configured')

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() })
    if (error) throw error
  }

  const updatePassword = async (password) => {
    if (!supabase) throw new Error('Supabase Auth is not configured')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    finishPasswordRecovery()
    setIsRecoveringPassword(false)
  }

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user || null,
    isLoading,
    isConfigured: isSupabaseConfigured,
    isRecoveringPassword,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
  }
}
