import GoogleSignInButton, { googleClientId } from './GoogleSignInButton'

// "Continue with Google" for both sign-in and sign-up: Google creates the account the first time.
// Reports progress with onBusy and failures with onError, so the form around it can show them.
export default function ContinueWithGoogle({ disabled, onGoogleSignIn, onGoogleIdToken, onBusy, onError }) {
  const run = async (signIn) => {
    onError('')
    onBusy(true)

    try {
      await signIn()
    } catch (signInError) {
      onError(signInError.message)
      onBusy(false)
    }
  }

  // Without a Google client ID, fall back to Supabase's redirect sign-in
  if (!googleClientId) {
    return (
      <button
        type="button"
        onClick={() => run(onGoogleSignIn)}
        disabled={disabled}
        className="w-full py-3 rounded-lg bg-hb-surface border border-hb-input text-hb-text font-semibold hover:bg-hb-surface2 disabled:opacity-50 transition"
      >
        Continue with Google
      </button>
    )
  }

  return (
    <GoogleSignInButton
      disabled={disabled}
      onCredential={(credential, nonce) => run(() => onGoogleIdToken(credential, nonce))}
      onError={(loadError) => onError(loadError.message)}
    />
  )
}
