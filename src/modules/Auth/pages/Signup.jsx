import { useState } from 'react'

export default function Signup({ isConfigured, onSignUp, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await onSignUp(email, password)
      if (!data.session) {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (signUpError) {
      setError(signUpError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <main className="w-full max-w-sm bg-hb-surface rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-hb-text">Create your account</h1>
          <p className="text-hb-text2">Start a shared HomeBase household</p>
        </div>

        {error && <p className="p-3 rounded-lg bg-hb-danger-bg text-hb-danger text-sm">{error}</p>}
        {message && <p className="p-3 rounded-lg bg-hb-success-bg text-hb-success text-sm">{message}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            minLength="6"
            required
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            minLength="6"
            required
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <button
            type="submit"
            disabled={!isConfigured || isSubmitting}
            className="w-full py-3 rounded-lg bg-hb-primary text-hb-on-primary font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full text-sm text-hb-primary hover:underline"
        >
          Back to sign in
        </button>
      </main>
    </div>
  )
}