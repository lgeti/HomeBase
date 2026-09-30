import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from './core/hooks/useLocalStorage'
import { useExpensesApi } from './core/hooks/useExpensesApi'
import { createHousehold } from './core/api/expensesApi'
import { useAuth } from './core/auth/useAuth'
import ProfileSetup from './components/ProfileSetup'
import Login from './modules/Auth/pages/Login'
import CategoryView from './modules/Expenses/pages/CategoryView'
import Dashboard from './modules/Expenses/pages/Dashboard'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import TransactionForm from './modules/Expenses/components/TransactionForm'

export default function App() {
  const { user: authUser, isLoading: authLoading, isConfigured, signInWithGoogle, signOut } = useAuth()
  const [user, setUser] = useLocalStorage('homebase_user', null)
  const [household, setHousehold] = useLocalStorage('homebase_household', null)
  const { expenses, addExpense, deleteExpense, isLoading: expensesLoading, error: expensesError } = useExpensesApi(household)
  const [isLoading, setIsLoading] = useState(true)
  const [isPreparingHousehold, setIsPreparingHousehold] = useState(false)
  const [apiError, setApiError] = useState('')
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
    if (!user || household || householdInitializationStarted.current) return

    householdInitializationStarted.current = true
    setIsPreparingHousehold(true)
    setApiError('')

    createHousehold(`${user.person1} & ${user.person2}`, [user.person1, user.person2])
      .then(setHousehold)
      .catch((error) => setApiError(error.message))
      .finally(() => setIsPreparingHousehold(false))
  }, [household, setHousehold, user])

  const handleProfileSet = async (profile) => {
    setApiError('')

    try {
      const createdHousehold = await createHousehold(
        `${profile.person1} & ${profile.person2}`,
        [profile.person1, profile.person2]
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
    return <Login isConfigured={isConfigured} onGoogleSignIn={signInWithGoogle} />
  }

  if (!user) {
    return <ProfileSetup onProfileSet={handleProfileSet} errorMessage={apiError} />
  }

  return (
    <div className="flex flex-col h-screen bg-warm-cream">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">HomeBase</h1>
        <p className="text-xs text-gray-500">
          {user.person1} & {user.person2}
        </p>
      </header>

      {(apiError || expensesError) && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-sm text-red-700">
          {apiError || expensesError}
        </div>
      )}

      <div className="flex-1 min-h-0">
        {activeView === 'dashboard' ? (
          <Dashboard expenses={expenses} user={user} />
        ) : (
          <CategoryView
            expenses={expenses}
            onDeleteExpense={deleteExpense}
            user={user}
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
          user={user}
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
