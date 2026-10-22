import { useState } from 'react'
import { createInvitation } from '../core/api/expensesApi'
import { buildInviteLink } from '../core/utils/pendingInvite'
import Icon from './Icon'
import InviteLinkBox from './InviteLinkBox'
import Logo from './Logo'

const TIPS = [
  { icon: 'plus', title: 'The + button adds what fits', text: 'An expense, a shopping item, food or a chore, depending on where you are.' },
  { icon: 'receipt', title: 'Scan receipts', text: 'Add an expense and tap Scan receipt: the fridge and shopping list update too.' },
  { icon: 'users', title: 'Household, top right', text: 'Invite more people or change your name any time.' },
]

// Dots for the three set-up steps: the household, inviting people, tips
export function OnboardingProgress({ step }) {
  return (
    <div className="flex justify-center gap-2" aria-label={`Step ${step} of 3`}>
      {[1, 2, 3].map((dot) => (
        <span key={dot} className={`h-1.5 w-8 rounded-full ${dot <= step ? 'bg-hb-primary' : 'bg-hb-track'}`} />
      ))}
    </div>
  )
}

const Card = ({ step, children }) => (
  <div className="flex items-center justify-center min-h-screen bg-hb-bg px-4 py-8">
    <div className="w-full max-w-sm bg-hb-surface rounded-2xl shadow-lg p-8 space-y-6">
      <OnboardingProgress step={step} />
      {children}
    </div>
  </div>
)

// After the household is created: an optional invite, then a few tips before the app opens
export default function Onboarding({ household, onHouseholdChange, onFinish }) {
  const [step, setStep] = useState('invite')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [createdInvite, setCreatedInvite] = useState(null)

  const handleInvite = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Enter their name')
      return
    }

    setError('')
    setIsSending(true)
    try {
      const invitation = await createInvitation(household.household_id, { displayName: trimmedName })
      setCreatedInvite({ link: buildInviteLink(invitation.inviteToken), name: trimmedName })
      setName('')
      await onHouseholdChange()
    } catch (inviteError) {
      setError(inviteError.message)
    } finally {
      setIsSending(false)
    }
  }

  if (step === 'tips') {
    return (
      <Card step={3}>
        <div className="text-center space-y-2">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-hb-text">{household.name} is ready</h1>
          <p className="text-hb-text2">A few things worth knowing:</p>
        </div>

        <ul className="space-y-4">
          {TIPS.map((tip) => (
            <li key={tip.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hb-primary-tint text-hb-primary">
                <Icon name={tip.icon} size={20} />
              </span>
              <div>
                <p className="font-semibold text-hb-text">{tip.title}</p>
                <p className="text-sm text-hb-text2">{tip.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onFinish}
          className="w-full bg-hb-primary hover:bg-opacity-90 text-hb-on-primary font-semibold py-3 rounded-lg transition"
        >
          Open HomeBase
        </button>
      </Card>
    )
  }

  return (
    <Card step={2}>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-hb-text">Who do you live with?</h1>
        <p className="text-hb-text2">
          Invite a partner, family member or flatmate. They'll see the same lists, money and chores.
        </p>
      </div>

      <form onSubmit={handleInvite} className="space-y-3">
        <div>
          <label htmlFor="onboardingInviteName" className="block text-sm font-medium text-hb-text2 mb-2">
            Their name
          </label>
          <input
            id="onboardingInviteName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g., Sam"
            className="w-full px-4 py-3 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary transition"
          />
        </div>
        {error && <div className="p-3 bg-hb-danger-bg text-hb-danger rounded-lg text-sm">{error}</div>}
        <button
          type="submit"
          disabled={isSending}
          className="w-full rounded-lg border border-hb-primary py-3 font-semibold text-hb-primary disabled:opacity-60"
        >
          {isSending ? 'Creating link...' : createdInvite ? 'Invite someone else' : 'Create invite link'}
        </button>
      </form>

      {createdInvite && <InviteLinkBox key={createdInvite.link} link={createdInvite.link} name={createdInvite.name} />}

      <button
        type="button"
        onClick={() => setStep('tips')}
        className="w-full bg-hb-primary hover:bg-opacity-90 text-hb-on-primary font-semibold py-3 rounded-lg transition"
      >
        {createdInvite ? 'Continue' : 'Skip for now'}
      </button>
    </Card>
  )
}
