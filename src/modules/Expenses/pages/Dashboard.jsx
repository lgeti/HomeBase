import { useMemo, useState } from 'react'
import { getCategoryById } from '../../../config/categories'
import {
  calculateBalance,
  formatCurrency,
  getCurrentMonthYear,
  getMonthCategoryBreakdown,
  getMonthName,
  getMonthTotal,
  getMemberSummary,
} from '../../../core/utils/calculations'

export default function Dashboard({ expenses, members }) {
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthYear())

  const monthName = getMonthName(selectedMonth.year, selectedMonth.month)

  const monthData = useMemo(() => {
    const total = getMonthTotal(expenses, selectedMonth.year, selectedMonth.month)
    const categoryBreakdown = getMonthCategoryBreakdown(
      expenses,
      selectedMonth.year,
      selectedMonth.month
    )
    const memberSummary = getMemberSummary(
      expenses,
      members,
      selectedMonth.year,
      selectedMonth.month
    )
    const balance = calculateBalance(
      expenses,
      members,
      selectedMonth.year,
      selectedMonth.month
    )

    return { total, categoryBreakdown, memberSummary, balance }
  }, [expenses, members, selectedMonth.month, selectedMonth.year])

  const totalPaid = Object.values(monthData.memberSummary).reduce((sum, member) => sum + member.paid, 0)

  const recentMonths = [0, -1, -2].map((offset) => {
    const date = new Date(selectedMonth.year, selectedMonth.month + offset, 1)
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      total: getMonthTotal(expenses, date.getFullYear(), date.getMonth()),
    }
  })

  const moveMonth = (offset) => {
    setSelectedMonth((current) => {
      const nextDate = new Date(current.year, current.month + offset, 1)
      return { year: nextDate.getFullYear(), month: nextDate.getMonth() }
    })
  }

  const balanceLabel = (() => {
    const { owes, owed, amount } = monthData.balance
    if (!owes || !owed || amount === 0) {
      return 'Settled up this month'
    }
    return `${owes} owes ${owed} ${formatCurrency(amount)}`
  })()

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 py-4 space-y-4 bg-gradient-to-b from-warm-cream via-white to-spring-mint/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-spring-sage font-semibold">Summary</p>
          <h2 className="text-2xl font-semibold text-gray-800">{monthName}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm active:scale-95"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-700 shadow-sm active:scale-95"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <section className="rounded-3xl bg-white shadow-sm border border-white/70 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">This Month Total</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{formatCurrency(monthData.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Balance</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{balanceLabel}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {recentMonths.map((recentMonth, index) => (
          <article
            key={`${recentMonth.year}-${recentMonth.month}`}
            className={`rounded-2xl p-3 border ${index === 0 ? 'bg-spring-mint/30 border-spring-sage/30' : 'bg-white border-gray-100'}`}
          >
            <p className="text-xs text-gray-500 truncate">
              {getMonthName(recentMonth.year, recentMonth.month)}
            </p>
            <p className="text-base font-semibold text-gray-900 mt-1">
              {formatCurrency(recentMonth.total)}
            </p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member, index) => {
          const memberName = member.display_name
          const memberSummary = monthData.memberSummary[memberName] || { paid: 0, net: 0 }
          const memberShare = totalPaid > 0 ? (memberSummary.paid / totalPaid) * 100 : 0

          return (
            <article key={member.household_member_id || memberName} className="rounded-3xl bg-white p-4 border border-gray-100 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">{memberName}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{formatCurrency(memberSummary.paid)}</p>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full ${index % 2 ? 'bg-spring-peach' : 'bg-spring-sage'}`} style={{ width: `${memberShare}%` }} />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Paid {memberShare.toFixed(0)}% of tracked spending · Net {memberSummary.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(memberSummary.net))}
              </p>
            </article>
          )
        })}
      </section>

      <section className="rounded-3xl bg-white p-5 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Category Breakdown</p>
            <h3 className="text-lg font-semibold text-gray-900">Where the month went</h3>
          </div>
          <p className="text-sm text-gray-500">{monthData.categoryBreakdown.length} categories</p>
        </div>

        {monthData.categoryBreakdown.length === 0 ? (
          <div className="rounded-2xl bg-warm-cream/70 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            No transactions for this month yet.
          </div>
        ) : (
          <div className="space-y-3">
            {monthData.categoryBreakdown.map((entry) => {
              const category = getCategoryById(entry.categoryId)
              const width = monthData.total > 0 ? (entry.total / monthData.total) * 100 : 0

              return (
                <div key={entry.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{category?.emoji}</span>
                      <span className="font-medium text-gray-700 truncate">{category?.name || entry.categoryId}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">{formatCurrency(entry.total)}</span>
                      <span className="text-gray-400 ml-2">{width.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(width, 4)}%`,
                        backgroundColor: category?.color || '#9ca3af',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-spring-sage/15 via-white to-spring-peach/20 p-5 border border-white shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400 font-semibold">Shared Balance</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Settlement</h3>
            <p className="text-sm text-gray-600 mt-1">{balanceLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-[0.2em] font-semibold">Month total</p>
            <p className="text-xl font-semibold text-gray-900">{formatCurrency(monthData.total)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
