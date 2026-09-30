import { useState } from 'react'

export default function ProfileSetup({ onProfileSet, errorMessage = '' }) {
  const [person1, setPerson1] = useState('')
  const [person2, setPerson2] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!person1.trim() || !person2.trim()) {
      setError('Both names are required')
      return
    }

    if (person1.trim() === person2.trim()) {
      setError('Names must be different')
      return
    }

    onProfileSet({ person1: person1.trim(), person2: person2.trim() })
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
              <label htmlFor="person1" className="block text-sm font-medium text-gray-700 mb-2">
                Your name
              </label>
              <input
                id="person1"
                type="text"
                value={person1}
                onChange={(e) => setPerson1(e.target.value)}
                placeholder="e.g., Alex"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage transition"
              />
            </div>

            <div>
              <label htmlFor="person2" className="block text-sm font-medium text-gray-700 mb-2">
                Partner's name
              </label>
              <input
                id="person2"
                type="text"
                value={person2}
                onChange={(e) => setPerson2(e.target.value)}
                placeholder="e.g., Jordan"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage transition"
              />
            </div>

            {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
            {errorMessage && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{errorMessage}</div>}

            <button
              type="submit"
              className="w-full bg-spring-sage hover:bg-opacity-90 text-white font-semibold py-3 rounded-lg transition"
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
