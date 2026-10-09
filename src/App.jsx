import { useState, useEffect } from 'react'
import { useAuth } from './core/auth/useAuth'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { useHousehold } from './core/hooks/useHousehold'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import BottomNav from './components/BottomNav'
import HouseholdErrorScreen from './components/HouseholdErrorScreen'
import LoadingScreen from './components/LoadingScreen'
import ProfileSetup from './components/ProfileSetup'
import AuthScreen from './modules/Auth/pages/AuthScreen'
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

  if (authLoading || householdLoading) return <LoadingScreen />

  if (!authUser) {
    return (
      <AuthScreen
        isConfigured={isConfigured}
        onGoogleSignIn={signInWithGoogle}
        onPasswordSignIn={signInWithPassword}
        onSignUp={signUpWithPassword}
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

  const members = household.members || []
  const errorMessage = apiError || inviteError || expensesError

  return (
    <div className="flex flex-col h-screen bg-warm-cream">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">{household.name}</h1>
        <p className="text-xs text-gray-500">
          {members.map((member) => member.display_name).join(' · ')}
        </p>
      </header>

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-sm text-red-700">
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
          <Dashboard expenses={expenses} members={members} />
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
          members={members}
          onSubmit={handleAddTransaction}
          onCancel={() => setShowAddForm(false)}
          defaultCategoryId={selectedCategoryId}
          defaultPayerId={members.find((member) => member.auth_user_id === authUserId)?.household_member_id}
        />
      </AddTransactionSheetWrapper>

      <BottomNav activeView={activeView} onNavigate={setActiveView} onAdd={() => setShowAddForm(true)} />
    </div>
  )
}
