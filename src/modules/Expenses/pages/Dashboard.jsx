import { useMemo, useState } from 'react'
import Icon, { CategoryIcon } from '../../../components/Icon'
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

  const { owes, owed, amount: balanceAmount } = monthData.balance
  const isSettled = !owes || !owed || balanceAmount === 0

  return (
    <div className="flex-1 overflow-y-auto pb-28 px-4 py-[18px] space-y-3 bg-hb-bg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-hb-primary font-bold">Summary</p>
          <h2 className="text-2xl font-semibold text-hb-text">{monthName}</h2>
        </div>
        <div className="flex items-center gap-2">
          {[{ offset: -1, icon: 'left', label: 'Previous month' }, { offset: 1, icon: 'right', label: 'Next month' }].map((button) => (
            <button
              key={button.icon}
              type="button"
              onClick={() => moveMonth(button.offset)}
              aria-label={button.label}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-hb-surface border border-hb-border text-hb-text active:scale-95 transition"
            >
              <Icon name={button.icon} size={18} />
            </button>
          ))}
        </div>
      </div>

      <section className="flex items-end justify-between gap-4 rounded-[22px] bg-hb-hero px-5 py-[18px] text-hb-on-hero">
        <div>
          <p className="text-[13px] text-hb-on-hero/75">This month total</p>
          <p className="text-[32px] font-bold tracking-tight mt-0.5">{formatCurrency(monthData.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-hb-on-hero/75">Balance</p>
          <p className="text-[13px] font-semibold mt-0.5">
            {isSettled ? 'Settled up' : (
              <>
                {owes} owes {owed}
                <br />
                {formatCurrency(balanceAmount)}
              </>
            )}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {recentMonths.map((recentMonth, index) => (
          <article
            key={`${recentMonth.year}-${recentMonth.month}`}
            className={`rounded-2xl px-3 py-2.5 border ${index === 0 ? 'bg-hb-primary-tint border-hb-primary/30' : 'bg-hb-surface border-hb-border'}`}
          >
            <p className="text-[11px] text-hb-text2 truncate">{getMonthName(recentMonth.year, recentMonth.month)}</p>
            <p className="text-[15px] font-semibold text-hb-text mt-0.5">{formatCurrency(recentMonth.total)}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-2">
        {members.map((member, index) => {
          const memberSummary = monthData.memberSummary[member.household_member_id] || { paid: 0, net: 0 }
          const memberShare = totalPaid > 0 ? (memberSummary.paid / totalPaid) * 100 : 0
          const avatar = index % 2 ? 'bg-hb-person-b text-hb-on-person-b' : 'bg-hb-primary text-hb-on-primary'

          return (
            <article key={member.household_member_id} className="rounded-[18px] bg-hb-surface p-3.5 border border-hb-border">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatar}`} aria-hidden="true">
                  {member.display_name.charAt(0).toUpperCase()}
                </span>
                <p className="text-xs font-semibold text-hb-text2 truncate">{member.display_name}</p>
              </div>
              <p className="text-xl font-bold text-hb-text mt-2">{formatCurrency(memberSummary.paid)}</p>
              <div className="mt-2 h-1.5 rounded-full bg-hb-track overflow-hidden">
                <div className={`h-full rounded-full ${index % 2 ? 'bg-hb-person-b' : 'bg-hb-primary'}`} style={{ width: `${memberShare}%` }} />
              </div>
              <p className="text-[11px] text-hb-text2 mt-1.5">
                {memberShare.toFixed(0)}% of spending · Net {memberSummary.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(memberSummary.net))}
              </p>
            </article>
          )
        })}
      </section>

      <section className="rounded-[22px] bg-hb-surface p-4 border border-hb-border space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-hb-text2 font-bold">Category breakdown</p>
          <h3 className="text-base font-semibold text-hb-text">Where the month went</h3>
        </div>

        {monthData.categoryBreakdown.length === 0 ? (
          <div className="rounded-2xl bg-hb-bg border border-dashed border-hb-border p-6 text-center text-sm text-hb-text2">
            No transactions for this month yet.
          </div>
        ) : (
          monthData.categoryBreakdown.map((entry) => {
            const category = getCategoryById(entry.categoryId)
            const width = monthData.total > 0 ? (entry.total / monthData.total) * 100 : 0

            return (
              <div key={entry.categoryId} className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon category={category} size={15} tile="h-[26px] w-[26px] rounded-lg" />
                  <p className="flex-1 min-w-0 truncate text-[13px] font-semibold text-hb-text">{category?.name || entry.categoryId}</p>
                  <p className="text-[13px] font-semibold text-hb-text">{formatCurrency(entry.total)}</p>
                  <p className="w-9 text-right text-xs text-hb-text3">{width.toFixed(0)}%</p>
                </div>
                <div className="h-2 rounded-full bg-hb-track overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.max(width, 4)}%`, backgroundColor: category?.color || 'var(--cat-other)' }}
                  />
                </div>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
