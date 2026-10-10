import { useState } from 'react'

export default function SetNewPassword({ onSave }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (password !== confirmation) {
      setError('The passwords do not match')
      return
    }

    setIsSaving(true)
    try {
      await onSave(password)
    } catch (saveError) {
      setError(saveError.message)
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4">
      <main className="w-full max-w-sm bg-hb-surface rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-hb-text">Choose a new password</h1>
          <p className="text-hb-text2">You'll stay signed in afterwards</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="p-3 rounded-lg bg-hb-danger-bg text-hb-danger text-sm">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            minLength="6"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Repeat new password"
            minLength="6"
            required
            autoComplete="new-password"
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 rounded-lg bg-hb-primary text-hb-on-primary font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {isSaving ? 'Saving...' : 'Save new password'}
          </button>
        </form>
      </main>
    </div>
  )
}
