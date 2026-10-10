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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-spring-mint px-4">
      <main className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to HomeBase</h1>
          <p className="text-gray-600">Sign in to access your household</p>
        </div>

        {!isConfigured && (
          <p className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
            Authentication is not configured for this build yet.
          </p>
        )}

        {error && <p className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

        <form onSubmit={handlePasswordSignIn} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            minLength="6"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage"
          />
          <button
            type="submit"
            disabled={!isConfigured || isSigningIn}
            className="w-full py-3 rounded-lg bg-spring-sage text-white font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isSigningIn ? 'Signing in...' : 'Sign in with email'}
          </button>
          <button
            type="button"
            onClick={onForgotPassword}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Forgot your password?
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px bg-gray-200 flex-1" />
          or
          <span className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!isConfigured || isSigningIn}
          className="w-full py-3 rounded-lg bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={onSwitchToSignup}
          className="w-full text-sm text-spring-sage hover:underline"
        >
          Create a new account
        </button>
      </main>
    </div>
  )
}
