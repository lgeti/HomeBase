import { useState } from 'react'
import { hasPendingInvite } from '../../../core/utils/pendingInvite'
import ForgotPassword from './ForgotPassword'
import Login from './Login'
import Signup from './Signup'

// Sign in or sign up, with a notice when the person arrived from an invite link
export default function AuthScreen({ initialMode = 'login', onBack, isConfigured, onGoogleSignIn, onGoogleIdToken, onPasswordSignIn, onSignUp, onSendPasswordReset }) {
  const [mode, setMode] = useState(initialMode)

  return (
    <>
      {hasPendingInvite() && (
        <div className="fixed inset-x-0 top-0 z-50 bg-hb-primary px-4 py-2 text-center text-sm text-hb-on-primary">
          You've been invited to a household. Sign in or create an account to join.
        </div>
      )}
      {mode === 'reset' ? (
        <ForgotPassword
          isConfigured={isConfigured}
          onSendReset={onSendPasswordReset}
          onBack={() => setMode('login')}
        />
      ) : mode === 'signup' ? (
        <Signup
          isConfigured={isConfigured}
          onSignUp={onSignUp}
          onSwitchToLogin={() => setMode('login')}
          onBack={onBack}
        />
      ) : (
        <Login
          isConfigured={isConfigured}
          onGoogleSignIn={onGoogleSignIn}
          onGoogleIdToken={onGoogleIdToken}
          onPasswordSignIn={onPasswordSignIn}
          onSwitchToSignup={() => setMode('signup')}
          onForgotPassword={() => setMode('reset')}
          onBack={onBack}
        />
      )}
    </>
  )
}
