// An invite link looks like <app>/?invite=<token>. The token is kept in localStorage until the
// person is signed in, so it survives signing in, signing up and email confirmation (which opens a new tab).
const STORAGE_KEY = 'homebase_pending_invite'

export const buildInviteLink = (token) =>
  `${window.location.origin}${import.meta.env.BASE_URL}?invite=${encodeURIComponent(token)}`

// Moves ?invite=<token> from the address bar into storage. Call once before the app renders.
export const captureInviteFromUrl = () => {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('invite')
  if (!token) return

  try {
    window.localStorage.setItem(STORAGE_KEY, token)
  } catch {
    // Storage can be unavailable (private mode); the invite is then lost and can be opened again
  }

  url.searchParams.delete('invite')
  window.history.replaceState(null, '', url)
}

export const hasPendingInvite = () => {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return false
  }
}

// Returns the stored token and removes it, so each invite is only tried once
export const takePendingInvite = () => {
  try {
    const token = window.localStorage.getItem(STORAGE_KEY)
    window.localStorage.removeItem(STORAGE_KEY)
    return token
  } catch {
    return null
  }
}
