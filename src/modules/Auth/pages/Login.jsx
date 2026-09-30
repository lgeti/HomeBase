import { useState } from 'react'

export default function Login({ isConfigured, onGoogleSignIn }) {
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

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!isConfigured || isSigningIn}
          className="w-full py-3 rounded-lg bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 disabled:opacity-50 transition"
        >
          {isSigningIn ? 'Opening Google...' : 'Continue with Google'}
        </button>
      </main>
    </div>
  )
}
