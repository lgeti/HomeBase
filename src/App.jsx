import { useState, useEffect } from 'react'
import { useLocalStorage, useExpenses } from './core/hooks/useLocalStorage'
import ProfileSetup from './components/ProfileSetup'
import CategoryView from './modules/Expenses/pages/CategoryView'
import Dashboard from './modules/Expenses/pages/Dashboard'
import { AddTransactionSheetWrapper } from './components/AddTransactionSheet'
import TransactionForm from './modules/Expenses/components/TransactionForm'
import { DEMO_TRANSACTIONS } from './core/utils/demoData'
import { applyRecurringTransactions } from './core/utils/calculations'

export default function App() {
  const [user, setUser] = useLocalStorage('homebase_user', null)
  const { expenses, addExpense, deleteExpense, setExpenses } = useExpenses()
  const [isLoading, setIsLoading] = useState(true)
  const [showDemoLoader, setShowDemoLoader] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeView, setActiveView] = useState('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState('groceries')

  useEffect(() => {
    // Simulate brief loading state
    const timer = setTimeout(() => setIsLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!user) return

    const { expenses: nextExpenses, generated } = applyRecurringTransactions(expenses, new Date())

    if (generated.length > 0) {
      setExpenses([...generated, ...nextExpenses])
    }
  }, [expenses, setExpenses, user])

  const handleProfileSet = (profile) => {
    setUser(profile)
    // Check if expenses are empty and load demo data
    const stored = localStorage.getItem('homebase_expenses')
    if (!stored || JSON.parse(stored).length === 0) {
      // Initialize with all demo transactions
      localStorage.setItem('homebase_expenses', JSON.stringify(DEMO_TRANSACTIONS))
      // Trigger page reload to reflect changes
      setTimeout(() => window.location.reload(), 100)
    }
  }

  const loadDemoData = () => {
    // Add all remaining demo transactions
    const existing = JSON.parse(localStorage.getItem('homebase_expenses') || '[]')
    const allTransactions = [...DEMO_TRANSACTIONS, ...existing]
    // Remove duplicates by ID
    const unique = Array.from(new Map(allTransactions.map(t => [t.id, t])).values())
    localStorage.setItem('homebase_expenses', JSON.stringify(unique))
    // Force re-render
    window.location.reload()
  }

  const handleAddTransaction = (expense) => {
    addExpense(expense)
    setShowAddForm(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-spring-mint">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800">HomeBase</h1>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <ProfileSetup onProfileSet={handleProfileSet} />
  }

  return (
    <div className="flex flex-col h-screen bg-warm-cream">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-gray-800">HomeBase</h1>
        <p className="text-xs text-gray-500">
          {user.person1} & {user.person2}
        </p>
      </header>

      {showDemoLoader && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-gray-800">Demo Data</h3>
            <p className="text-sm text-gray-600">
              Load sample transactions to see how HomeBase works?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDemoLoader(false)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={loadDemoData}
                className="flex-1 px-4 py-2 bg-spring-sage text-white rounded-lg text-sm hover:opacity-90"
              >
                Load Demo Data
              </button>
            </div>
          </div>
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
            onClick={() => setShowDemoLoader(!showDemoLoader)}
            className="flex-1 py-3 text-center text-gray-400 hover:text-gray-600"
          >
            <span className="text-xl">⚙️</span>
            <span className="text-xs block">Settings</span>
          </button>
        </nav>
      </footer>
    </div>
  )
}
