import { useState, useEffect, useRef } from 'react'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { fetchMyHousehold, createHousehold, acceptInvitation } from './core/api/expensesApi'
import { hasPendingInvite, takePendingInvite } from './core/utils/pendingInvite'
import { useAuth } from './core/auth/useAuth'
import ProfileSetup from './components/ProfileSetup'
import Login from './modules/Auth/pages/Login'
import Signup from './modules/Auth/pages/Signup'
import CategoryView from './modules/Expenses/pages/CategoryView'
import Dashboard from './modules/Expenses/pages/Dashboard'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import TransactionForm from './modules/Expenses/components/TransactionForm'
import HouseholdView from './modules/Household/pages/HouseholdView'

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

export default function App() {
  const {
    user: authUser,
    isLoading: authLoading,
    isConfigured,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  } = useAuth()
  const [household, setHousehold] = useState(null)
  // The signed-in user whose household lookup has finished, so the setup screen never flashes while it loads
  const [householdCheckedFor, setHouseholdCheckedFor] = useState(null)
  const { expenses, addExpense, deleteExpense, error: expensesError } = useExpensesApi(household)
  const [householdLookupError, setHouseholdLookupError] = useState('')
  const [apiError, setApiError] = useState('')
  const [inviteError, setInviteError] = useState('')
  // Shared across effect re-runs (React StrictMode runs effects twice) so an invite is only accepted once
  const inviteAcceptance = useRef(null)
  const [authMode, setAuthMode] = useState('login')
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState('groceries')
  const authUserId = authUser?.id

  useEffect(() => {
    if (!authUserId) {
      inviteAcceptance.current = null
      setHousehold(null)
      setHouseholdCheckedFor(null)
      return undefined
    }

    if (householdCheckedFor === authUserId) return undefined

    let isCancelled = false
    setHouseholdLookupError('')
    setApiError('')

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
        if (!isCancelled) setHouseholdLookupError(error.message)
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

  const handleProfileSet = async (profile) => {
    setApiError('')

    try {
      const createdHousehold = await createHousehold(
        profile.householdName,
        profile.ownerName,
        profile.members
      )
      setHousehold(createdHousehold)
    } catch (error) {
      setApiError(error.message)
    }
  }

  const handleAddTransaction = (expense) => {
    const isHouseholdMember = household?.members?.some(
      (member) => member.household_member_id === expense.paidByMemberId
    )

    if (!isHouseholdMember) {
      setApiError('The selected payer is not connected to this household')
      return
    }

    addExpense(expense)
      .then(() => setShowAddForm(false))
      .catch((error) => setApiError(error.message))
  }

  if (authLoading || (authUserId && householdCheckedFor !== authUserId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-spring-mint">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">HomeBase</h1>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return (
      <>
        {hasPendingInvite() && (
          <div className="fixed inset-x-0 top-0 z-50 bg-spring-sage px-4 py-2 text-center text-sm text-white">
            You've been invited to a household. Sign in or create an account with the email the invite was sent to.
          </div>
        )}
        {authMode === 'signup' ? (
          <Signup
            isConfigured={isConfigured}
            onSignUp={signUpWithPassword}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        ) : (
          <Login
            isConfigured={isConfigured}
            onGoogleSignIn={signInWithGoogle}
            onPasswordSignIn={signInWithPassword}
            onSwitchToSignup={() => setAuthMode('signup')}
          />
        )}
      </>
    )
  }

  if (!household) {
    if (householdLookupError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-warm-cream px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
            <h1 className="text-2xl font-semibold text-gray-800">HomeBase</h1>
            <p className="mt-3 text-sm text-red-700">
              HomeBase could not reach the household service. Your data was not changed.
            </p>
            <p className="mt-2 break-words text-xs text-gray-500">{householdLookupError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 w-full rounded-lg bg-spring-sage py-3 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    const initialOwnerName = authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || authUser.email?.split('@')[0]

    return (
      <ProfileSetup
        onProfileSet={handleProfileSet}
        initialOwnerName={initialOwnerName}
        errorMessage={apiError || inviteError}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-warm-cream">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">{household.name}</h1>
        <p className="text-xs text-gray-500">
          {household?.members?.map((member) => member.display_name).join(' · ')}
        </p>
      </header>

      {(apiError || inviteError || expensesError) && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-sm text-red-700">
          {apiError || inviteError || expensesError}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeView === 'household' ? (
          <HouseholdView
            household={household}
            currentUserId={authUserId}
            onHouseholdChange={refreshHousehold}
            onSignOut={signOut}
          />
        ) : activeView === 'dashboard' ? (
          <Dashboard expenses={expenses} members={household?.members || []} />
        ) : (
          <CategoryView
            expenses={expenses}
            onDeleteExpense={deleteExpense}
            members={household?.members || []}
            onCategoryChange={setSelectedCategoryId}
          />
        )}
      </div>

      {/* Add Transaction Form Sheet */}
      <AddTransactionSheetWrapper
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
      >
        <TransactionForm
          members={household?.members || []}
          onSubmit={handleAddTransaction}
          onCancel={() => setShowAddForm(false)}
          defaultCategoryId={selectedCategoryId}
          defaultPayerId={household.members.find((member) => member.auth_user_id === authUserId)?.household_member_id}
        />
      </AddTransactionSheetWrapper>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-2">
        <nav className="max-w-lg mx-auto flex justify-around gap-1">
          <button
            onClick={() => setActiveView('categories')}
            className={`flex-1 py-3 text-center font-semibold hover:text-opacity-80 ${
              activeView === 'categories' ? 'text-spring-sage' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">📋</span>
            <span className="text-xs block">Categories</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex-1 py-3 text-center text-spring-sage font-semibold hover:text-opacity-80"
          >
            <span className="text-xl">➕</span>
            <span className="text-xs block">Add</span>
          </button>
          <button
            onClick={() => setActiveView(activeView === 'dashboard' ? 'categories' : 'dashboard')}
            className={`flex-1 py-3 text-center font-semibold hover:text-opacity-80 ${
              activeView === 'dashboard' ? 'text-spring-sage' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs block">Dashboard</span>
          </button>
          <button
            onClick={() => setActiveView('household')}
            className={`flex-1 py-3 text-center font-semibold hover:text-opacity-80 ${
              activeView === 'household' ? 'text-spring-sage' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="text-xl">👥</span>
            <span className="text-xs block">Household</span>
          </button>
        </nav>
      </footer>
    </div>
  )
}
