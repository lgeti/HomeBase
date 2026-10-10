import { getCategoryById } from '../config/categories'
import { formatCurrency, formatDate, getMemberName } from '../core/utils/calculations'

export default function TransactionList({ transactions, onDelete, members }) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">No transactions yet</p>
        <p className="text-gray-300 text-xs mt-1">Add one to get started →</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => {
        const category = getCategoryById(transaction.categoryId)
        const personLabel = `${getMemberName(members, transaction.paidByMemberId)} paid`

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-100 hover:shadow-sm transition group"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">{category?.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">
                  {transaction.description || category?.name}
                </p>
                {transaction.tag && (
                  <p className="text-xs text-gray-400">{transaction.tag}</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  {personLabel} • {formatDate(transaction.date)}
                </p>
                {transaction.isRecurring && (
                  <p className="text-[11px] text-spring-sage mt-1">
                    🔁 {transaction.recurringFrequency || 'monthly'}
                  </p>
                )}
                {transaction.isAutoAdded && (
                  <p className="text-[11px] text-gray-400 mt-1">🔁 Added automatically</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-gray-800">
                  {formatCurrency(transaction.amount)}
                </p>
                {transaction.splitType === 'split' && (
                  <p className="text-xs text-gray-400">Split</p>
                )}
              </div>
              {/* Always visible on touch screens; mouse users see it on hover or keyboard focus */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this expense?')) onDelete(transaction.id)
                }}
                className="p-2 -m-2 ml-0 text-gray-400 hover:text-red-500 focus:opacity-100 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                title="Delete"
                aria-label="Delete expense"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
