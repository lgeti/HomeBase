import { useState } from 'react'

export default function Login({ isConfigured, onGoogleSignIn, onPasswordSignIn, onSwitchToSignup, onForgotPassword }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleGoogleSignIn = async () => {
    setError('')
    setIsSigningIn(true)

    try {
      await onGoogleSignIn()
    } catch (signInError) {
      setError(signInError.message)
      setIsSigningIn(false)
    }
  }

  const handlePasswordSignIn = async (event) => {
    event.preventDefault()
    setError('')
    setIsSigningIn(true)

    try {
      await onPasswordSignIn(email, password)
    } catch (signInError) {
      setError(signInError.message)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <main className="w-full max-w-sm bg-hb-surface rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-hb-text">Welcome to HomeBase</h1>
          <p className="text-hb-text2">Sign in to access your household</p>
        </div>

        {!isConfigured && (
          <p className="p-3 rounded-lg bg-hb-warning-bg text-hb-warning text-sm">
            Authentication is not configured for this build yet.
          </p>
        )}

        {error && <p className="p-3 rounded-lg bg-hb-danger-bg text-hb-danger text-sm">{error}</p>}

        <form onSubmit={handlePasswordSignIn} className="space-y-3">
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
          <button
            type="submit"
            disabled={!isConfigured || isSigningIn}
            className="w-full py-3 rounded-lg bg-hb-primary text-hb-on-primary font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with email'}
          </button>
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm text-hb-text2 hover:underline"
          >
            Forgot your password?
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-hb-text3">
          <span className="h-px bg-hb-border flex-1" />
          or
          <span className="h-px bg-hb-border flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!isConfigured || isSigningIn}
          className="w-full py-3 rounded-lg bg-hb-surface border border-hb-input text-hb-text font-semibold hover:bg-hb-surface2 disabled:opacity-50 transition"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={onSwitchToSignup}
          className="w-full text-sm text-hb-primary hover:underline"
        >
          Create a new account
        </button>
      </main>
    </div>
  )
}
