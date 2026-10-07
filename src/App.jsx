import { useState, useEffect, useRef } from 'react'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { fetchMyHousehold, createHousehold } from './core/api/expensesApi'
import { useAuth } from './core/auth/useAuth'
import ProfileSetup from './components/ProfileSetup'
import Login from './modules/Auth/pages/Login'
import Signup from './modules/Auth/pages/Signup'
import CategoryView from './modules/Expenses/pages/CategoryView'
import Dashboard from './modules/Expenses/pages/Dashboard'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import TransactionForm from './modules/Expenses/components/TransactionForm'

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
  const [user, setUser] = useState(null)
  const [household, setHousehold] = useState(null)
  const { expenses, addExpense, deleteExpense, isLoading: expensesLoading, error: expensesError } = useExpensesApi(household)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparingHousehold, setIsPreparingHousehold] = useState(false)
  const [householdLookupError, setHouseholdLookupError] = useState('')
  const [apiError, setApiError] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState('groceries')
  const householdInitializationStarted = useRef(false)

  useEffect(() => {
    // Simulate brief loading state
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!authUser) {
      householdInitializationStarted.current = false
      setHousehold(null)
      setUser(null)
      return
    }

    if (household || householdInitializationStarted.current) return

    householdInitializationStarted.current = true
    setIsPreparingHousehold(true)
    setHouseholdLookupError('')
    setApiError('')

    fetchMyHousehold()
      .then((existingHousehold) => {
        if (!existingHousehold) {
          setHousehold(null)
          setUser(null)
          return
        }

        setHousehold(existingHousehold)
        const owner = existingHousehold.members.find(
          (member) => member.auth_user_id === authUser.id
        )
        setUser({
          householdName: existingHousehold.name,
          ownerName: owner?.display_name || authUser.email?.split('@')[0] || 'Owner',
          members: existingHousehold.members
            .filter((member) => member.auth_user_id !== authUser.id)
            .map((member) => member.display_name),
        })
      })
      .catch((error) => setHouseholdLookupError(error.message))
      .finally(() => {
        householdInitializationStarted.current = false
        setIsPreparingHousehold(false)
      })
  }, [authUser, household, setHousehold, setUser])

  const handleProfileSet = async (profile) => {
    setApiError('')

    try {
      const createdHousehold = await createHousehold(
        profile.householdName,
        profile.ownerName,
        profile.members
      )
      setUser(profile)
      setHousehold(createdHousehold)
    } catch (error) {
      setApiError(error.message)
    }
  }

  const handleAddTransaction = (expense) => {
    const paidByMember = household?.members?.find(
      (member) => member.display_name === expense.whoPaid
    )

    if (!paidByMember) {
      setApiError('The selected payer is not connected to this household')
      return
    }

    addExpense({
      ...expense,
      paidByMemberId: paidByMember.household_member_id,
    })
      .then(() => setShowAddForm(false))
      .catch((error) => setApiError(error.message))
  }

  if (authLoading || isLoading || isPreparingHousehold) {
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
    if (authMode === 'signup') {
      return (
        <Signup
          isConfigured={isConfigured}
          onSignUp={signUpWithPassword}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      )
    }

    return (
      <Login
        isConfigured={isConfigured}
        onGoogleSignIn={signInWithGoogle}
        onPasswordSignIn={signInWithPassword}
        onSwitchToSignup={() => setAuthMode('signup')}
      />
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
        errorMessage={apiError}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-warm-cream">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">HomeBase</h1>
        <p className="text-xs text-gray-500">
          {household?.members?.map((member) => member.display_name).join(' · ')}
        </p>
      </header>

      {(apiError || expensesError) && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-sm text-red-700">
          {apiError || expensesError}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeView === 'dashboard' ? (
          // Render the Dashboard view
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
            onClick={signOut}
            className="flex-1 py-3 text-center text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">⚙️</span>
            <span className="text-xs block">Sign out</span>
          </button>
        </nav>
      </footer>
    </div>
  )
}
