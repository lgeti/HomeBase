import { useEffect, useRef, useState } from 'react'
import { acceptInvitation, createHousehold as createHouseholdRequest, fetchMyHousehold } from '../api/expensesApi'
import { takePendingInvite } from '../utils/pendingInvite'

// Accepts an invite link opened before sign-in. Resolves to an error message, or '' when there was nothing to accept.
const acceptPendingInvite = async () => {
  const token = takePendingInvite()
  if (!token) return ''

  try {
    await acceptInvitation(token)
    return ''
  } catch (error) {
    return `Could not join the household from your invite link: ${error.message}`
  }
}

// Loads the signed-in user's household, accepting a pending invite link first
export const useHousehold = (authUserId) => {
  const [household, setHousehold] = useState(null)
  // The signed-in user whose household lookup has finished, so the setup screen never flashes while it loads
  const [householdCheckedFor, setHouseholdCheckedFor] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [inviteError, setInviteError] = useState('')
  // Shared across effect re-runs (React StrictMode runs effects twice) so an invite is only accepted once
  const inviteAcceptance = useRef(null)

  useEffect(() => {
    if (!authUserId) {
      inviteAcceptance.current = null
      setHousehold(null)
      setHouseholdCheckedFor(null)
      return undefined
    }

    if (householdCheckedFor === authUserId) return undefined

    let isCancelled = false
    setLookupError('')

    inviteAcceptance.current ??= acceptPendingInvite()
    inviteAcceptance.current
      .then((acceptError) => {
        if (!isCancelled && acceptError) setInviteError(acceptError)
        return fetchMyHousehold()
      })
      .then((existingHousehold) => {
        if (!isCancelled) setHousehold(existingHousehold)
      })
      .catch((error) => {
        if (!isCancelled) setLookupError(error.message)
      })
      .finally(() => {
        if (!isCancelled) setHouseholdCheckedFor(authUserId)
      })

    return () => {
      isCancelled = true
    }
  }, [authUserId, householdCheckedFor])

  const refreshHousehold = async () => {
    setHousehold(await fetchMyHousehold())
  }

  // Throws on failure so the caller can show the error
  const createHousehold = async ({ householdName, ownerName, members }) => {
    setHousehold(await createHouseholdRequest(householdName, ownerName, members))
  }

  return {
    household,
    isLoading: Boolean(authUserId && householdCheckedFor !== authUserId),
    lookupError,
    inviteError,
    refreshHousehold,
    createHousehold,
  }
}
