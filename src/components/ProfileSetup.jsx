import { useState } from 'react'

export default function ProfileSetup({ onProfileSet, initialOwnerName = '', errorMessage = '' }) {
  const [householdName, setHouseholdName] = useState('')
  const [ownerName, setOwnerName] = useState(initialOwnerName)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const trimmedHouseholdName = householdName.trim()
    const trimmedOwnerName = ownerName.trim()
    
    if (!trimmedHouseholdName || !trimmedOwnerName) {
      setError('Household name and your name are required')
      return
    }

    onProfileSet({
      householdName: trimmedHouseholdName,
      ownerName: trimmedOwnerName,
      members: [],
    })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-spring-mint px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-800">Welcome to HomeBase</h1>
            <p className="text-gray-600">Let's set up your household</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="householdName" className="block text-sm font-medium text-gray-700 mb-2">
                Household name
              </label>
              <input
                id="householdName"
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., The Cabin"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition"
              />
            </div>
            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                Your name
              </label>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep transition"
              />
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            {errorMessage && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{errorMessage}</div>}

            <button
              type="submit"
              className="w-full bg-spring-sage-deep hover:bg-opacity-90 text-white font-semibold py-3 rounded-lg transition"
            >
              Get Started
            </button>
          </form>

          <p className="text-xs text-center text-gray-500">
            Your household data will be connected to your signed-in account.
          </p>
        </div>
      </div>
    </div>
  )
}
