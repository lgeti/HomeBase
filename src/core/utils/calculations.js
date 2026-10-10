// Totals always use the full amount: that is what the household spent. Whether an expense is split
// only changes who owes whom (see getMemberSummary).
const amountOf = (expense) => parseFloat(expense.amount || 0)

export const getCategoryTotal = (expenses, categoryId) => {
  return expenses
    .filter((exp) => exp.categoryId === categoryId)
    .reduce((sum, exp) => sum + amountOf(exp), 0)
}

// Expense dates are 'YYYY-MM-DD' calendar dates. new Date('YYYY-MM-DD') would read them as UTC midnight,
// which is still the previous day anywhere west of UTC, so build the date in local time instead.
export const parseLocalDate = (dateString) => {
  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Today's local calendar date as 'YYYY-MM-DD' (toISOString would give the UTC date)
export const todayDateString = (now = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const getMonthExpenses = (expenses, year, month) => {
  return expenses.filter((exp) => {
    const expDate = parseLocalDate(exp.date)
    return expDate.getFullYear() === year && expDate.getMonth() === month
  })
}

export const getMonthTotal = (expenses, year, month) => {
  return getMonthExpenses(expenses, year, month)
    .reduce((sum, exp) => sum + amountOf(exp), 0)
}

export const getMonthCategoryBreakdown = (expenses, year, month) => {
  const monthExpenses = getMonthExpenses(expenses, year, month)
  const totalsByCategory = monthExpenses.reduce((totals, expense) => {
    const currentTotal = totals.get(expense.categoryId) || 0
    totals.set(expense.categoryId, currentTotal + amountOf(expense))
    return totals
  }, new Map())

  return Array.from(totalsByCategory.entries())
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((left, right) => right.total - left.total)
}

// Name to show for a payer. Members who were removed are no longer in the household's member list.
export const getMemberName = (members, memberId) =>
  members.find((member) => member.household_member_id === memberId)?.display_name || 'Removed member'

// Members who have joined. People who were added or invited but have not joined yet do not pay or share expenses.
export const getJoinedMembers = (members) => members.filter((member) => (member.status ?? 'active') === 'active')

// Paid, owed and net amounts for the month, keyed by household_member_id.
// A split expense is shared equally between all joined members; otherwise the payer owes all of it.
export const getMemberSummary = (expenses, members, year, month) => {
  const monthExpenses = getMonthExpenses(expenses, year, month)
  const summary = Object.fromEntries(getJoinedMembers(members).map((member) => [
    member.household_member_id,
    { name: member.display_name, paid: 0, owed: 0, net: 0 },
  ]))
  const memberSummaries = Object.values(summary)

  monthExpenses.forEach((expense) => {
    const amount = amountOf(expense)
    const payer = summary[expense.paidByMemberId]

    if (payer) {
      payer.paid += amount
    }

    if (expense.splitType === 'split') {
      const share = memberSummaries.length > 0 ? amount / memberSummaries.length : 0
      memberSummaries.forEach((member) => {
        member.owed += share
      })
    } else if (payer) {
      payer.owed += amount
    }
  })

  memberSummaries.forEach((member) => {
    member.net = member.paid - member.owed
  })

  return summary
}

export const calculateBalance = (expenses, members, year, month) => {
  const summary = getMemberSummary(expenses, members, year, month)
  const sortedMembers = Object.entries(summary).sort((left, right) => right[1].net - left[1].net)
  const owed = sortedMembers[0]
  const owes = sortedMembers[sortedMembers.length - 1]

  if (!owed || !owes || owed[0] === owes[0] || owed[1].net <= 0 || owes[1].net >= 0) {
    return { owes: null, owed: null, amount: 0 }
  }

  return {
    owes: owes[1].name,
    owed: owed[1].name,
    amount: Math.min(owed[1].net, Math.abs(owes[1].net)),
  }
}

export const formatCurrency = (amount, currency = '€') => {
  return `${currency}${parseFloat(amount || 0).toFixed(2)}`
}

export const formatDate = (dateString) => {
  return parseLocalDate(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "9 Oct" for this year, "9 Oct 2025" otherwise
export const formatShortDate = (dateString, today = new Date()) => {
  const date = parseLocalDate(dateString)
  const dayMonth = `${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
  return date.getFullYear() === today.getFullYear() ? dayMonth : `${dayMonth} ${date.getFullYear()}`
}

export const getMonthName = (year, month) => {
  return new Date(year, month).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

export const getCurrentMonthYear = () => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}
