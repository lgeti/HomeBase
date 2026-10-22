import { supabase } from '../auth/supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

// A random id for this open copy of the app. Live updates carry it, so the app can skip the news of its own changes.
export const CLIENT_ID = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}-${Math.random().toString(36).slice(2)}`

// 402 means the household's plan does not cover this; the app listens for it and shows the upgrade prompt
export const UPGRADE_EVENT = 'homebase:upgrade-needed'

export const apiRequest = async (path, options = {}) => {
  const { data: sessionData } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } }
  const authorization = sessionData.session?.access_token

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-HomeBase-Client': CLIENT_ID,
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(data?.error || `API request failed with status ${response.status}`)
    error.status = response.status
    error.code = data?.code
    if (response.status === 402) window.dispatchEvent(new CustomEvent(UPGRADE_EVENT, { detail: data }))
    throw error
  }

  return data
}

export { API_BASE_URL }
