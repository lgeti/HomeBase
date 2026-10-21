import { useEffect, useRef, useState } from 'react'

// Google's own sign-in button (Google Identity Services). Sign-in happens in a Google popup on this site,
// so Google shows HomeBase's address instead of the Supabase project's.
const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=en'
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

let scriptPromise = null
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve()
  scriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_URL
    script.async = true
    script.onload = resolve
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not load Google sign-in. Check your connection and try again.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

// Google gets the SHA-256 of the nonce and Supabase gets the nonce itself, so a stolen token can't be replayed
const makeNonce = async () => {
  const nonce = crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nonce))
  const hashedNonce = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return { nonce, hashedNonce }
}

export default function GoogleSignInButton({ disabled, onCredential, onError }) {
  const containerRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  // Latest handlers, so Google's callback (set once) never calls stale ones
  const handlersRef = useRef({ onCredential, onError })
  handlersRef.current = { onCredential, onError }

  useEffect(() => {
    let isCancelled = false

    const setUp = async () => {
      await loadGoogleScript()
      const { nonce, hashedNonce } = await makeNonce()
      if (isCancelled || !containerRef.current) return

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        nonce: hashedNonce,
        callback: ({ credential }) => handlersRef.current.onCredential(credential, nonce),
      })

      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        locale: 'en',
        width: Math.min(containerRef.current.offsetWidth || 320, 400),
      })
      setIsReady(true)
    }

    setUp().catch((error) => {
      if (!isCancelled) handlersRef.current.onError(error)
    })

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div
      className={`flex justify-center min-h-[44px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      aria-busy={!isReady}
    >
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  )
}
