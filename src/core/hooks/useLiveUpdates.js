import { useEffect, useRef } from 'react'
import { CLIENT_ID } from '../api/client'
import { supabase } from '../auth/supabaseClient'
import { sectionsToReload, STALE_AFTER_MS } from '../utils/liveUpdates'

const RELOAD_DELAY_MS = 300

// Keeps every device of a household up to date. The API announces "this section changed" on the household's
// private Realtime channel, and `reloaders[section]` fetches it again through the API. Coming back to the app
// after a while, or reconnecting, reloads everything in case a message was missed.
export const useLiveUpdates = (householdId, reloaders) => {
  const reloadersRef = useRef(reloaders)
  reloadersRef.current = reloaders

  useEffect(() => {
    if (!supabase || !householdId) return undefined

    const timers = {}
    // Several changes in a row (ticking off a few items) become one reload per section
    const reload = (section) => {
      clearTimeout(timers[section])
      timers[section] = setTimeout(() => reloadersRef.current[section]?.(), RELOAD_DELAY_MS)
    }
    const reloadAll = () => Object.keys(reloadersRef.current).forEach(reload)

    let channel
    let hasConnected = false
    let isClosed = false

    const connect = async () => {
      // Private channels need the signed-in user's token, so the access rule can check membership
      await supabase.realtime.setAuth()
      if (isClosed) return
      channel = supabase
        .channel(`household:${householdId}`, { config: { private: true } })
        .on('broadcast', { event: 'changed' }, ({ payload }) => sectionsToReload(payload, CLIENT_ID).forEach(reload))
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return
          if (hasConnected) reloadAll()
          hasConnected = true
        })
    }
    connect()

    let hiddenAt = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (hiddenAt && Date.now() - hiddenAt > STALE_AFTER_MS) {
        reloadAll()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isClosed = true
      document.removeEventListener('visibilitychange', onVisibility)
      Object.values(timers).forEach(clearTimeout)
      if (channel) supabase.removeChannel(channel)
    }
  }, [householdId])
}
