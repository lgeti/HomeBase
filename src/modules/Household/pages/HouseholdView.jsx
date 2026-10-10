import { useState } from 'react'
import { createInvitation, removeMember, updateMyDisplayName } from '../../../core/api/expensesApi'
import { buildInviteLink } from '../../../core/utils/pendingInvite'
// The same rule the server enforces, so the Remove button only appears when removing is allowed
import { canRemoveMember } from '../../../../server/src/authorization.js'

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' }
const NEW_MEMBER = 'new'

const memberStatus = (member) => {
  if (member.status === 'active') return 'Joined'
  return member.invited_email ? `Invited · ${member.invited_email}` : 'Not invited yet'
}

export default function HouseholdView({ household, currentUserId, onHouseholdChange, onSignOut }) {
  const members = household.members || []
  const currentMember = members.find((member) => member.auth_user_id === currentUserId)
  const canInvite = ['owner', 'admin'].includes(currentMember?.role)
  const pendingMembers = members.filter((member) => member.status === 'pending')

  const [inviteTarget, setInviteTarget] = useState(pendingMembers[0]?.household_member_id || NEW_MEMBER)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [createdInvite, setCreatedInvite] = useState(null)
  const [copied, setCopied] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const [nameDraft, setNameDraft] = useState(null)
  const [nameError, setNameError] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const handleRemove = async (member) => {
    if (!window.confirm(`Remove ${member.display_name} from the household?`)) return

    setRemoveError('')
    try {
      await removeMember(household.household_id, member.household_member_id)
      await onHouseholdChange()
    } catch (removeFailure) {
      setRemoveError(removeFailure.message)
    }
  }

  const saveName = async (event) => {
    event.preventDefault()
    const trimmedName = nameDraft.trim()
    if (!trimmedName) {
      setNameError('Enter a name')
      return
    }

    setIsSavingName(true)
    setNameError('')
    try {
      await updateMyDisplayName(household.household_id, trimmedName)
      await onHouseholdChange()
      setNameDraft(null)
    } catch (saveError) {
      setNameError(saveError.message)
    } finally {
      setIsSavingName(false)
    }
  }

  const handleInvite = async (event) => {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    const trimmedName = displayName.trim()
    const isNewMember = inviteTarget === NEW_MEMBER

    if (!trimmedEmail.includes('@')) {
      setError('Enter the email address they will sign in with')
      return
    }

    if (isNewMember && !trimmedName) {
      setError('Enter their name')
      return
    }

    setIsSending(true)
    try {
      const invitation = await createInvitation(
        household.household_id,
        isNewMember
          ? { email: trimmedEmail, displayName: trimmedName }
          : { email: trimmedEmail, memberId: inviteTarget }
      )
      const invitedName = isNewMember
        ? trimmedName
        : pendingMembers.find((member) => member.household_member_id === inviteTarget)?.display_name

      setCreatedInvite({ link: buildInviteLink(invitation.inviteToken), email: invitation.email, name: invitedName })
      setCopied(false)
      setEmail('')
      setDisplayName('')
      await onHouseholdChange()
    } catch (inviteError) {
      setError(inviteError.message)
    } finally {
      setIsSending(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdInvite.link)
      setCopied(true)
    } catch {
      setError('Could not copy automatically. Select the link and copy it instead.')
    }
  }

  const shareLink = () => {
    navigator.share({ title: 'Join my HomeBase household', url: createdInvite.link }).catch(() => {})
  }

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-spring-sage-deep font-semibold">Household</p>
          <h2 className="text-2xl font-semibold text-gray-800">{household.name}</h2>
        </div>

        {removeError && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{removeError}</div>}

        <section className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
          {members.map((member) => {
            const isCurrentMember = member.household_member_id === currentMember?.household_member_id

            if (isCurrentMember && nameDraft !== null) {
              return (
                <form key={member.household_member_id} onSubmit={saveName} className="p-4 space-y-2">
                  <label htmlFor="myName" className="block text-sm font-medium text-gray-700">Your name</label>
                  <input
                    id="myName"
                    type="text"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    autoFocus
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep"
                  />
                  {nameError && <div className="p-2 bg-red-100 text-red-700 rounded-lg text-sm">{nameError}</div>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setNameDraft(null); setNameError('') }}
                      className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="flex-1 rounded-lg bg-spring-sage-deep disabled:opacity-60 py-2 text-sm font-semibold text-white"
                    >
                      {isSavingName ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )
            }

            return (
              <div key={member.household_member_id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {member.display_name}
                    {isCurrentMember && <span className="text-gray-400 font-normal"> (you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{memberStatus(member)}</p>
                  {isCurrentMember && (
                    <button
                      type="button"
                      onClick={() => setNameDraft(member.display_name)}
                      className="mt-1 text-xs font-semibold text-spring-sage-deep"
                    >
                      Change your name
                    </button>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  {canRemoveMember(currentMember, member) ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      aria-label={`Remove ${member.display_name}`}
                      title={`Remove ${member.display_name}`}
                      className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 active:bg-red-50 active:text-red-600 transition"
                    >
                      ✕
                    </button>
                  ) : canInvite && (
                    // Same space as the remove icon, so role badges line up for owners and admins
                    <span aria-hidden="true" className="-mr-2 h-8 w-8" />
                  )}
                </div>
              </div>
            )
          })}
        </section>

        {canInvite && (
          <section className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800">Invite someone</h3>
              <p className="text-sm text-gray-500">
                You'll get a link to send them. It works for 7 days, only for the email you enter.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              {pendingMembers.length > 0 && (
                <div>
                  <label htmlFor="inviteTarget" className="block text-sm font-medium text-gray-700 mb-1">
                    Who are you inviting?
                  </label>
                  <select
                    id="inviteTarget"
                    value={inviteTarget}
                    onChange={(event) => setInviteTarget(event.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-spring-sage-deep"
                  >
                    {pendingMembers.map((member) => (
                      <option key={member.household_member_id} value={member.household_member_id}>
                        {member.display_name}
                      </option>
                    ))}
                    <option value={NEW_MEMBER}>Someone new</option>
                  </select>
                </div>
              )}

              {inviteTarget === NEW_MEMBER && (
                <div>
                  <label htmlFor="inviteName" className="block text-sm font-medium text-gray-700 mb-1">
                    Their name
                  </label>
                  <input
                    id="inviteName"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="e.g., Sam"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep"
                  />
                </div>
              )}

              <div>
                <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Their email
                </label>
                <input
                  id="inviteEmail"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="The email they sign in with"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spring-sage-deep"
                />
              </div>

              {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-spring-sage-deep hover:bg-opacity-90 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition"
              >
                {isSending ? 'Creating link...' : 'Create invite link'}
              </button>
            </form>

            {createdInvite && (
              <div className="rounded-lg bg-spring-mint/40 p-3 space-y-2">
                <p className="text-sm text-gray-700">
                  Send this link to {createdInvite.name || 'them'}. They need to sign in as{' '}
                  <span className="font-medium">{createdInvite.email}</span>.
                </p>
                <input
                  readOnly
                  value={createdInvite.link}
                  onFocus={(event) => event.target.select()}
                  aria-label="Invite link"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-600"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex-1 rounded-lg border border-spring-sage-deep py-2 text-sm font-semibold text-spring-sage-deep"
                  >
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                  {typeof navigator.share === 'function' && (
                    <button
                      type="button"
                      onClick={shareLink}
                      className="flex-1 rounded-lg bg-spring-sage-deep py-2 text-sm font-semibold text-white"
                    >
                      Share
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-lg border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
