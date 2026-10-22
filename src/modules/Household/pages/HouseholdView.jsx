import { useEffect, useState } from 'react'
import InviteLinkBox from '../../../components/InviteLinkBox'
import { createInvitation, removeMember, updateMyDisplayName } from '../../../core/api/expensesApi'
import { fetchPlan } from '../../../core/api/planApi'
import { buildInviteLink } from '../../../core/utils/pendingInvite'
// The same rule the server enforces, so the Remove button only appears when removing is allowed
import { canRemoveMember } from '../../../../server/src/authorization.js'

const ROLE_LABELS = { owner: 'Owner', admin: 'Admin', member: 'Member' }
const NEW_MEMBER = 'new'

const memberStatus = (member) => {
  if (member.status === 'active') return 'Joined'
  return member.invited_at ? 'Invited' : 'Not invited yet'
}

// Used of limit, or just the count when there is no limit
const formatUsage = ({ used, limit }) => (limit === null ? `${used}` : `${used} of ${limit}`)

// The household's plan and how much of it this month has used. Billing comes later.
function PlanUsage({ household }) {
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState('')

  // household changes when members join or leave, so the counts follow
  useEffect(() => {
    let isCurrent = true
    fetchPlan(household.household_id)
      .then((loaded) => { if (isCurrent) { setPlan(loaded); setError('') } })
      .catch((loadError) => { if (isCurrent) setError(loadError.message) })
    return () => { isCurrent = false }
  }, [household])

  return (
    <section className="bg-hb-surface rounded-xl border border-hb-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-hb-text">Plan & usage</h3>
        {plan && (
          <span className="rounded-full bg-hb-primary-tint px-2.5 py-1 text-xs font-semibold text-hb-primary">{plan.name}</span>
        )}
      </div>
      {error && <div className="p-3 bg-hb-danger-bg text-hb-danger rounded-lg text-sm">{error}</div>}
      {!plan && !error && <p className="text-sm text-hb-text2">Loading...</p>}
      {plan && (
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-hb-text2">Members</dt>
            <dd className="text-hb-text">{formatUsage(plan.members)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-hb-text2">AI calls this month</dt>
            <dd className="text-hb-text">{formatUsage(plan.usage.ai_call)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-hb-text2">HomeBase in Claude</dt>
            <dd className="text-hb-text">{plan.features.mcp ? 'Included' : 'Pro only'}</dd>
          </div>
        </dl>
      )}
      {plan?.plan === 'free' && (
        <p className="text-xs text-hb-text3">Pro adds unlimited members, more AI calls and HomeBase in Claude. Upgrading from the app is coming soon.</p>
      )}
    </section>
  )
}

export default function HouseholdView({ household, currentUserId, onHouseholdChange, onSignOut }) {
  const members = household.members || []
  const currentMember = members.find((member) => member.auth_user_id === currentUserId)
  const canInvite = ['owner', 'admin'].includes(currentMember?.role)
  const pendingMembers = members.filter((member) => member.status === 'pending')

  const [inviteTarget, setInviteTarget] = useState(pendingMembers[0]?.household_member_id || NEW_MEMBER)
  const [displayName, setDisplayName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [createdInvite, setCreatedInvite] = useState(null)
  const [removeError, setRemoveError] = useState('')
  const [confirmingRemoveId, setConfirmingRemoveId] = useState(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [nameDraft, setNameDraft] = useState(null)
  const [nameError, setNameError] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const handleRemove = async (member) => {
    setRemoveError('')
    setIsRemoving(true)
    try {
      await removeMember(household.household_id, member.household_member_id)
      await onHouseholdChange()
      setConfirmingRemoveId(null)
    } catch (removeFailure) {
      setRemoveError(removeFailure.message)
    } finally {
      setIsRemoving(false)
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

    const trimmedName = displayName.trim()
    const isNewMember = inviteTarget === NEW_MEMBER

    if (isNewMember && !trimmedName) {
      setError('Enter their name')
      return
    }

    setIsSending(true)
    try {
      const invitation = await createInvitation(
        household.household_id,
        isNewMember
          ? { displayName: trimmedName }
          : { memberId: inviteTarget }
      )
      const invitedName = isNewMember
        ? trimmedName
        : pendingMembers.find((member) => member.household_member_id === inviteTarget)?.display_name

      setCreatedInvite({ link: buildInviteLink(invitation.inviteToken), name: invitedName })
      setDisplayName('')
      await onHouseholdChange()
    } catch (inviteError) {
      setError(inviteError.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-hb-primary font-semibold">Household</p>
          <h2 className="text-2xl font-semibold text-hb-text">{household.name}</h2>
        </div>

        {removeError && <div className="p-3 bg-hb-danger-bg text-hb-danger rounded-lg text-sm">{removeError}</div>}

        <section className="bg-hb-surface rounded-xl border border-hb-border divide-y divide-hb-border">
          {members.map((member) => {
            const isCurrentMember = member.household_member_id === currentMember?.household_member_id

            if (isCurrentMember && nameDraft !== null) {
              return (
                <form key={member.household_member_id} onSubmit={saveName} className="p-4 space-y-2">
                  <label htmlFor="myName" className="block text-sm font-medium text-hb-text2">Your name</label>
                  <input
                    id="myName"
                    type="text"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    autoFocus
                    className="w-full px-3 py-2.5 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
                  />
                  {nameError && <div className="p-2 bg-hb-danger-bg text-hb-danger rounded-lg text-sm">{nameError}</div>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setNameDraft(null); setNameError('') }}
                      className="flex-1 rounded-lg border border-hb-border py-2 text-sm font-semibold text-hb-text2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="flex-1 rounded-lg bg-hb-primary disabled:opacity-60 py-2 text-sm font-semibold text-hb-on-primary"
                    >
                      {isSavingName ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              )
            }

            if (member.household_member_id === confirmingRemoveId) {
              return (
                <div key={member.household_member_id} className="flex items-center justify-between gap-3 p-4 bg-hb-danger-bg/60">
                  <p className="min-w-0 text-sm text-hb-text">
                    Remove <span className="font-medium">{member.display_name}</span> from the household?
                  </p>
                  <div className="shrink-0 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingRemoveId(null)}
                      className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(member)}
                      disabled={isRemoving}
                      className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger disabled:opacity-60"
                    >
                      {isRemoving ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={member.household_member_id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-hb-text truncate">
                    {member.display_name}
                    {isCurrentMember && <span className="text-hb-text3 font-normal"> (you)</span>}
                  </p>
                  <p className="text-xs text-hb-text2 truncate">{memberStatus(member)}</p>
                  {isCurrentMember && (
                    <button
                      type="button"
                      onClick={() => setNameDraft(member.display_name)}
                      className="mt-1 text-xs font-semibold text-hb-primary"
                    >
                      Change your name
                    </button>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="rounded-full bg-hb-surface2 px-2.5 py-1 text-xs text-hb-text2">
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                  {canRemoveMember(currentMember, member) ? (
                    <button
                      type="button"
                      onClick={() => { setRemoveError(''); setConfirmingRemoveId(member.household_member_id) }}
                      aria-label={`Remove ${member.display_name}`}
                      title={`Remove ${member.display_name}`}
                      className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-hb-text2 hover:bg-hb-danger-bg hover:text-hb-danger active:bg-hb-danger-bg active:text-hb-danger transition"
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
          <section className="bg-hb-surface rounded-xl border border-hb-border p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-hb-text">Invite someone</h3>
              <p className="text-sm text-hb-text2">
                You'll get a link to send them. It works once, for 7 days, with any account they sign in with.
              </p>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              {pendingMembers.length > 0 && (
                <div>
                  <label htmlFor="inviteTarget" className="block text-sm font-medium text-hb-text2 mb-1">
                    Who are you inviting?
                  </label>
                  <select
                    id="inviteTarget"
                    value={inviteTarget}
                    onChange={(event) => setInviteTarget(event.target.value)}
                    className="w-full px-3 py-2.5 border border-hb-input rounded-lg bg-hb-surface focus:outline-none focus:ring-2 focus:ring-hb-primary"
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
                  <label htmlFor="inviteName" className="block text-sm font-medium text-hb-text2 mb-1">
                    Their name
                  </label>
                  <input
                    id="inviteName"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="e.g., Sam"
                    className="w-full px-3 py-2.5 border border-hb-input rounded-lg focus:outline-none focus:ring-2 focus:ring-hb-primary"
                  />
                </div>
              )}

              {error && <div className="p-3 bg-hb-danger-bg text-hb-danger rounded-lg text-sm">{error}</div>}

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-hb-primary hover:bg-opacity-90 disabled:opacity-60 text-hb-on-primary font-semibold py-3 rounded-lg transition"
              >
                {isSending ? 'Creating link...' : 'Create invite link'}
              </button>
            </form>

            {createdInvite && <InviteLinkBox key={createdInvite.link} link={createdInvite.link} name={createdInvite.name} />}
          </section>
        )}

        <PlanUsage household={household} />

        <button
          type="button"
          onClick={onSignOut}
          className="w-full rounded-lg border border-hb-border bg-hb-surface py-3 text-sm font-semibold text-hb-text2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
