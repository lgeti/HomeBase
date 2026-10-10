import { useState } from 'react'
import { getCategoryById } from '../config/categories'
import { formatCurrency, formatShortDate, getMemberName } from '../core/utils/calculations'
import Icon, { CategoryIcon } from './Icon'

const FREQUENCY_LABELS = { weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }

export default function TransactionList({ transactions, onDelete, members }) {
  // Confirmed inside the row: native confirm() dialogs are blocked in some browsers
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-hb-text2 text-sm">No transactions yet</p>
        <p className="text-hb-text3 text-xs mt-1">Add one to get started →</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const category = getCategoryById(transaction.categoryId)
        // "Supermarket · Ana paid · 9 Oct"
        const meta = [transaction.tag, `${getMemberName(members, transaction.paidByMemberId)} paid`, formatShortDate(transaction.date)]
          .filter(Boolean)
          .join(' · ')

        if (transaction.id === confirmingDeleteId) {
          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between gap-3 bg-hb-danger-bg px-3.5 py-3 rounded-2xl border border-hb-danger/30"
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
            className="group flex items-center gap-3 bg-hb-surface px-3.5 py-3 rounded-2xl border border-hb-border"
          >
            <CategoryIcon category={category} size={20} tile="h-10 w-10 rounded-xl" />

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-hb-text truncate">
                {transaction.description || category?.name}
              </p>
              <p className="text-xs text-hb-text2 truncate">{meta}</p>
              {transaction.isRecurring && (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-hb-primary">
                  <Icon name="repeat" size={12} strokeWidth={2.2} />
                  {FREQUENCY_LABELS[transaction.recurringFrequency] || 'Monthly'}
                </p>
              )}
              {transaction.isAutoAdded && (
                <p className="flex items-center gap-1 text-[11px] text-hb-text2">
                  <Icon name="repeat" size={12} strokeWidth={2.2} />
                  Added automatically
                </p>
              )}
            </div>

            <div className="text-right flex flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-hb-text">{formatCurrency(transaction.amount)}</p>
              {transaction.splitType === 'split' && <p className="text-[11px] text-hb-text3">Split</p>}
            </div>

            {/* Always visible on touch screens; mouse users see it on hover or keyboard focus */}
            <button
              type="button"
              onClick={() => setConfirmingDeleteId(transaction.id)}
              className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-hb-text3 hover:bg-hb-danger-bg hover:text-hb-danger focus:opacity-100 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
              title="Delete"
              aria-label="Delete expense"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
