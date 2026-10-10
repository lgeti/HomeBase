import { useState } from 'react'
import { hasPendingInvite } from '../../../core/utils/pendingInvite'
import Login from './Login'
import Signup from './Signup'

// Sign in or sign up, with a notice when the person arrived from an invite link
export default function AuthScreen({ isConfigured, onGoogleSignIn, onPasswordSignIn, onSignUp }) {
  const [mode, setMode] = useState('login')

  return (
    <>
      {hasPendingInvite() && (
        <div className="fixed inset-x-0 top-0 z-50 bg-spring-sage px-4 py-2 text-center text-sm text-white">
          You've been invited to a household. Sign in or create an account with the email the invite was sent to.
        </div>
      )}
      {mode === 'signup' ? (
        <Signup
          isConfigured={isConfigured}
          onSignUp={onSignUp}
          onSwitchToLogin={() => setMode('login')}
        />
      ) : (
        <Login
          isConfigured={isConfigured}
          onGoogleSignIn={onGoogleSignIn}
          onPasswordSignIn={onPasswordSignIn}
          onSwitchToSignup={() => setMode('signup')}
        />
      )}
    </>
  )
}
