import { useState } from 'react'

export default function ForgotPassword({ isConfigured, onSendReset, onBack }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSending(true)

    try {
      await onSendReset(email.trim())
      setSentTo(email.trim())
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <main className="w-full max-w-sm bg-hb-surface rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-hb-text">Reset your password</h1>
          <p className="text-hb-text2">We'll email you a link to choose a new one</p>
        </div>

        {sentTo ? (
          <p className="p-3 rounded-lg bg-hb-primary-tint text-hb-text2 text-sm">
            If an account exists for <span className="font-medium">{sentTo}</span>, a reset link is on its way.
            Open it in this browser.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <p className="p-3 rounded-lg bg-hb-danger-bg text-hb-danger text-sm">{error}</p>}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
            />
            <button
              type="submit"
              disabled={!isConfigured || isSending}
              className="w-full py-3 rounded-lg bg-hb-primary text-hb-on-primary font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {isSending ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <button type="button" onClick={onBack} className="w-full text-sm text-hb-primary hover:underline">
          Back to sign in
        </button>
      </main>
    </div>
  )
}
