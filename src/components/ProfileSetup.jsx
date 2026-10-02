import { useState } from 'react'

export default function ProfileSetup({ onProfileSet, errorMessage = '' }) {
  const [householdName, setHouseholdName] = useState('')
  const [members, setMembers] = useState([''])
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    const memberNames = members.map((member) => member.trim()).filter(Boolean)

    if (!householdName.trim() || memberNames.length === 0) {
      setError('Household name and at least one member name are required')
      return
    }

    if (new Set(memberNames.map((member) => member.toLowerCase())).size !== memberNames.length) {
      setError('Member names must be different')
      return
    }

    onProfileSet({
      householdName: householdName.trim(),
      ownerName: memberNames[0],
      members: memberNames.slice(1),
      person1: memberNames[0],
      person2: memberNames[1] || memberNames[0],
    })
  }

  const updateMember = (index, value) => {
    setMembers((currentMembers) =>
      currentMembers.map((member, memberIndex) => memberIndex === index ? value : member)
    )
  }

  const addMember = () => setMembers((currentMembers) => [...currentMembers, ''])

  const removeMember = (index) => {
    setMembers((currentMembers) => currentMembers.filter((_, memberIndex) => memberIndex !== index))
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage transition"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Household members
              </label>
              {members.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    id={`member-${index}`}
                    type="text"
                    value={member}
                    onChange={(event) => updateMember(index, event.target.value)}
                    placeholder={index === 0 ? 'Your name' : 'Member name'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage transition"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      className="px-3 text-gray-400 hover:text-red-500"
                      aria-label={`Remove member ${index + 1}`}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMember}
                className="text-sm text-spring-sage font-semibold hover:underline"
              >
                + Add another member
              </button>
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
