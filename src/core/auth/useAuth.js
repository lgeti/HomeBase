import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export const useAuth = () => {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

    const redirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL
      || `${window.location.origin}${import.meta.env.BASE_URL}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
  }

  return {
    session,
    user: session?.user || null,
    isLoading,
    isConfigured: isSupabaseConfigured,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  }
}
