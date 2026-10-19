// When an app like Claude asks to use HomeBase as you, Supabase Auth opens <app>/oauth/consent?authorization_id=<id>.
// The id is kept in localStorage until it is answered, so it survives signing in on the way (Google sign-in
// leaves the page and comes back to the app's start page).
const STORAGE_KEY = 'homebase_pending_authorization'
// Also kept here, for when storage is unavailable
let capturedId = null

// Moves ?authorization_id=<id> from the address bar into storage. Call once before the app renders.
export const captureAuthorizationFromUrl = () => {
  const url = new URL(window.location.href)
  const authorizationId = url.searchParams.get('authorization_id')
  if (!authorizationId) return

  capturedId = authorizationId
  try {
    window.localStorage.setItem(STORAGE_KEY, authorizationId)
  } catch {
    // Storage can be unavailable (private mode); the request then only lasts while this page stays open
  }

  // The app shows the request from its start page, so the long address does not stay around
  window.history.replaceState(null, '', import.meta.env.BASE_URL)
}

export const getPendingAuthorization = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || capturedId
  } catch {
    return capturedId
  }
}

export const clearPendingAuthorization = () => {
  capturedId = null
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored
  }
}
