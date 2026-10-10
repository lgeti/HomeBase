import { useState, useMemo } from 'react'
import { getCategoryByName } from '../../../config/categories'
import { getCategoryTotal, getMonthExpenses, getMonthTotal, formatCurrency, getCurrentMonthYear } from '../../../core/utils/calculations'
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
    const monthExpenses = getMonthExpenses(expenses, year, month)
    if (activeTab === 'All') return monthExpenses

    const category = getCategoryByName(activeTab)
    return monthExpenses.filter((exp) => exp.categoryId === category.id)
  }, [activeTab, expenses, year, month])

  const monthTotal = useMemo(() => {
    if (activeTab === 'All') {
      return getMonthTotal(expenses, year, month)
    }
    const category = getCategoryByName(activeTab)
    return getCategoryTotal(getMonthExpenses(expenses, year, month), category.id)
  }, [activeTab, expenses, year, month])

  // 'YYYY-MM-DD' strings sort correctly as text, newest first
  const sortedExpenses = [...filteredExpenses].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col h-full">
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="max-w-lg mx-auto p-4">
          {/* Monthly Total */}
          <div className="bg-hb-surface rounded-xl p-4 mb-4 border border-hb-border">
            <p className="text-xs text-hb-text2 uppercase tracking-wide mb-1">
              {activeTab === 'All' ? 'This Month Total' : `${activeTab} This Month`}
            </p>
            <p className="text-3xl font-bold text-hb-text">{formatCurrency(monthTotal)}</p>
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
