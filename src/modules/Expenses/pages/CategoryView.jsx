import { useState, useMemo } from 'react'
import { getCategoryByName } from '../../../config/categories'
import { getCategoryTotal, getMonthTotal, formatCurrency, getCurrentMonthYear } from '../../../core/utils/calculations'
import TabBar from '../../../components/TabBar.jsx'
import TransactionList from '../../../components/TransactionList.jsx'

export default function CategoryView({ expenses, onDeleteExpense, members, onCategoryChange }) {
  const [activeTab, setActiveTab] = useState('All')
  const { year, month } = getCurrentMonthYear()

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (onCategoryChange) {
      if (tab === 'All') {
        onCategoryChange('groceries')
      } else {
        const category = getCategoryByName(tab)
        onCategoryChange(category?.id || 'groceries')
      }
    }
  }

  const filteredExpenses = useMemo(() => {
    if (activeTab === 'All') {
      return expenses.filter((exp) => {
        const expDate = new Date(exp.date)
        return expDate.getFullYear() === year && expDate.getMonth() === month
      })
    }

    const category = getCategoryByName(activeTab)
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date)
      return (
        exp.categoryId === category.id &&
        expDate.getFullYear() === year &&
        expDate.getMonth() === month
      )
    })
  }, [activeTab, expenses, year, month])

  const monthTotal = useMemo(() => {
    if (activeTab === 'All') {
      return getMonthTotal(expenses, year, month)
    }
    const category = getCategoryByName(activeTab)
    return getCategoryTotal(
      expenses.filter((exp) => {
        const expDate = new Date(exp.date)
        return expDate.getFullYear() === year && expDate.getMonth() === month
      }),
      category.id
    )
  }, [activeTab, expenses, year, month])

  const sortedExpenses = [...filteredExpenses].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <div className="flex flex-col h-full">
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-lg mx-auto p-4">
          {/* Monthly Total */}
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {activeTab === 'All' ? 'This Month Total' : `${activeTab} This Month`}
            </p>
            <p className="text-3xl font-bold text-gray-800">{formatCurrency(monthTotal)}</p>
          </div>

          {/* Transaction List */}
          <TransactionList
            transactions={sortedExpenses}
            onDelete={onDeleteExpense}
            members={members}
          />
        </div>
      </div>
    </div>
  )
}
