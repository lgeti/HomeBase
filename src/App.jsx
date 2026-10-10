import { useState, useEffect } from 'react'
import { useAuth } from './core/auth/useAuth'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { useHousehold } from './core/hooks/useHousehold'
import { getJoinedMembers } from './core/utils/calculations'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import BottomNav from './components/BottomNav'
import HouseholdErrorScreen from './components/HouseholdErrorScreen'
import LoadingScreen from './components/LoadingScreen'
import ProfileSetup from './components/ProfileSetup'
import AuthScreen from './modules/Auth/pages/AuthScreen'
import SetNewPassword from './modules/Auth/pages/SetNewPassword'
import TransactionForm from './modules/Expenses/components/TransactionForm'
import CategoryView from './modules/Expenses/pages/CategoryView'
import Dashboard from './modules/Expenses/pages/Dashboard'
import HouseholdView from './modules/Household/pages/HouseholdView'

export default function App() {
  const {
    user: authUser,
    isLoading: authLoading,
    isConfigured,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    isRecoveringPassword,
    signOut,
  } = useAuth()
  const authUserId = authUser?.id
  const {
    household,
    isLoading: householdLoading,
    lookupError,
    inviteError,
    refreshHousehold,
    createHousehold,
  } = useHousehold(authUserId)
  const { expenses, addExpense, deleteExpense, error: expensesError } = useExpensesApi(household)
  const [apiError, setApiError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState('groceries')

  // Errors belong to the previous account once someone else signs in
  useEffect(() => {
    setApiError('')
  }, [authUserId])

  const handleProfileSet = async (profile) => {
    setApiError('')

    try {
      await createHousehold(profile)
    } catch (error) {
      setApiError(error.message)
    }
  }

  const handleAddTransaction = (expense) => {
    const isHouseholdMember = getJoinedMembers(household?.members || []).some(
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

  if (authLoading) return <LoadingScreen />

  // Came back from a password-reset email: choose a new password before anything else
  if (authUser && isRecoveringPassword) return <SetNewPassword onSave={updatePassword} />

  if (householdLoading) return <LoadingScreen />

  if (!authUser) {
    return (
      <AuthScreen
        isConfigured={isConfigured}
        onGoogleSignIn={signInWithGoogle}
        onPasswordSignIn={signInWithPassword}
        onSignUp={signUpWithPassword}
        onSendPasswordReset={sendPasswordReset}
      />
    )
  }

  if (!household) {
    if (lookupError) return <HouseholdErrorScreen message={lookupError} />

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

  // All members, for naming the payer of older expenses; only joined members pay and share new ones
  const members = household.members || []
  const joinedMembers = getJoinedMembers(members)
  const errorMessage = apiError || inviteError || expensesError

  return (
    <div className="flex flex-col h-screen bg-hb-bg">
      <header className="bg-hb-surface/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-hb-text">{household.name}</h1>
        <p className="text-xs text-hb-text2">
          {joinedMembers.map((member) => member.display_name).join(' · ')}
        </p>
      </header>

      {errorMessage && (
        <div className="bg-hb-danger-bg border-b border-hb-danger/30 px-4 py-2 text-sm text-hb-danger">
          {errorMessage}
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
          <Dashboard expenses={expenses} members={joinedMembers} />
        ) : (
          <CategoryView
            expenses={expenses}
            onDeleteExpense={deleteExpense}
            members={members}
            onCategoryChange={setSelectedCategoryId}
          />
        )}
      </div>

      <AddTransactionSheetWrapper isOpen={showAddForm} onClose={() => setShowAddForm(false)}>
        <TransactionForm
          members={joinedMembers}
          onSubmit={handleAddTransaction}
          onCancel={() => setShowAddForm(false)}
          defaultCategoryId={selectedCategoryId}
          defaultPayerId={joinedMembers.find((member) => member.auth_user_id === authUserId)?.household_member_id}
        />
      </AddTransactionSheetWrapper>

      <BottomNav activeView={activeView} onNavigate={setActiveView} onAdd={() => setShowAddForm(true)} />
    </div>
  )
}
