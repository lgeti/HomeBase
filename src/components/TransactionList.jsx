import { useState } from 'react'
import { getCategoryById } from '../config/categories'
import { formatCurrency, formatDate, getMemberName } from '../core/utils/calculations'

export default function TransactionList({ transactions, onDelete, members }) {
  // Confirmed inside the row: native confirm() dialogs are blocked in some browsers
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-hb-text3 text-sm">No transactions yet</p>
        <p className="text-hb-text3 text-xs mt-1">Add one to get started →</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => {
        const category = getCategoryById(transaction.categoryId)
        const personLabel = `${getMemberName(members, transaction.paidByMemberId)} paid`

        if (transaction.id === confirmingDeleteId) {
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 bg-hb-danger-bg p-4 rounded-lg border border-hb-danger/30"
            >
              <p className="min-w-0 text-sm text-hb-text">
                Delete <span className="font-medium">{transaction.description || category?.name}</span>
                {' '}({formatCurrency(transaction.amount)})?
              </p>
              <div className="shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDeleteId(null)}
                  className="rounded-lg border border-hb-border bg-hb-surface px-3 py-1.5 text-sm font-semibold text-hb-text2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmingDeleteId(null)
                    onDelete(transaction.id)
                  }}
                  className="rounded-lg bg-hb-danger-solid px-3 py-1.5 text-sm font-semibold text-hb-on-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={transaction.id}
            className="flex items-center justify-between bg-hb-surface p-4 rounded-lg border border-hb-border hover:shadow-sm transition group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: category?.tint }}
                aria-hidden="true"
              >
                {category?.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-hb-text truncate">
                  {transaction.description || category?.name}
                </p>
                {transaction.tag && (
                  <p className="text-xs text-hb-text3">{transaction.tag}</p>
                )}
                <p className="text-xs text-hb-text2 mt-0.5">
                  {personLabel} • {formatDate(transaction.date)}
                </p>
                {transaction.isRecurring && (
                  <p className="text-[11px] text-hb-primary mt-1">
                    🔁 {transaction.recurringFrequency || 'monthly'}
                  </p>
                )}
                {transaction.isAutoAdded && (
                  <p className="text-[11px] text-hb-text3 mt-1">🔁 Added automatically</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-hb-text">
                  {formatCurrency(transaction.amount)}
                </p>
                {transaction.splitType === 'split' && (
                  <p className="text-xs text-hb-text3">Split</p>
                )}
              </div>
              {/* Always visible on touch screens; mouse users see it on hover or keyboard focus */}
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(transaction.id)}
                className="p-2 -m-2 ml-0 text-hb-text3 hover:text-hb-danger focus:opacity-100 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
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
