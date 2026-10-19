import { useEffect, useState } from 'react'
import Logo from '../../../components/Logo'
import { supabase } from '../../../core/auth/supabaseClient'
import { clearPendingAuthorization } from '../../../core/utils/pendingAuthorization'

// Asks whether an app like Claude may use HomeBase as the signed-in person. Supabase Auth runs the
// OAuth sign-in; this page only shows the request and passes on the answer.
export default function ConnectAppScreen({ authorizationId, email, onDone }) {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    let isCurrent = true
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: detailsError }) => {
      if (!isCurrent) return
      if (detailsError) return setError(detailsError.message)
      // Already approved before: Supabase answers with where to send the person straight away
      if (!data?.authorization_id && data?.redirect_url) {
        clearPendingAuthorization()
        window.location.href = data.redirect_url
        return
      }
      setDetails(data)
    })
    return () => {
      isCurrent = false
    }
  }, [authorizationId])

  const answer = async (approve) => {
    setIsSending(true)
    // The page sends the person back itself, once the stored request is cleared
    const options = { skipBrowserRedirect: true }
    const { data, error: answerError } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, options)
      : await supabase.auth.oauth.denyAuthorization(authorizationId, options)
    clearPendingAuthorization()
    if (answerError) {
      setIsSending(false)
      return setError(answerError.message)
    }
    window.location.href = data.redirect_url
  }

  const close = () => {
    clearPendingAuthorization()
    onDone()
  }

  const appName = details?.client?.name || 'An app'

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <div className="w-full max-w-sm rounded-2xl bg-hb-surface p-8 text-center shadow-lg">
        <Logo className="mx-auto mb-4" />
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-hb-text">Could not connect</h1>
            <p className="mt-3 break-words text-sm text-hb-danger">{error}</p>
            <p className="mt-2 text-xs text-hb-text2">Start connecting again from the other app.</p>
            <button
              type="button"
              onClick={close}
              className="mt-6 w-full rounded-lg bg-hb-primary py-3 font-semibold text-hb-on-primary"
            >
              Open HomeBase
            </button>
          </>
        ) : !details ? (
          <p className="text-sm text-hb-text2">Loading…</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-hb-text">Connect {appName}?</h1>
            <p className="mt-3 text-sm text-hb-text2">
              {appName} will be able to see and change your household's HomeBase as you ({email}).
              You can disconnect it later in {appName}.
            </p>
            <button
              type="button"
              disabled={isSending}
              onClick={() => answer(true)}
              className="mt-6 w-full rounded-lg bg-hb-primary py-3 font-semibold text-hb-on-primary disabled:opacity-60"
            >
              Allow
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() => answer(false)}
              className="mt-2 w-full rounded-lg border border-hb-border py-3 font-semibold text-hb-text disabled:opacity-60"
            >
              Don't allow
            </button>
          </>
        )}
      </div>
    </div>
  )
}
