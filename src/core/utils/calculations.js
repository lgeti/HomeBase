export const getCategoryTotal = (expenses, categoryId) => {
  return expenses
    .filter((exp) => exp.categoryId === categoryId)
    .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
}

export const getEffectiveAmount = (expense) => {
  const amount = parseFloat(expense.amount || 0)
  return expense.splitType === 'split' ? amount / 2 : amount
}

export const getMonthExpenses = (expenses, year, month) => {
  return expenses.filter((exp) => {
    const expDate = new Date(exp.date)
    return expDate.getFullYear() === year && expDate.getMonth() === month
  })
}

export const getMonthTotal = (expenses, year, month) => {
  return getMonthExpenses(expenses, year, month)
    .reduce((sum, exp) => {
      return sum + getEffectiveAmount(exp)
    }, 0)
}

export const getMonthCategoryBreakdown = (expenses, year, month) => {
  const monthExpenses = getMonthExpenses(expenses, year, month)
  const totalsByCategory = monthExpenses.reduce((totals, expense) => {
    const currentTotal = totals.get(expense.categoryId) || 0
    totals.set(expense.categoryId, currentTotal + getEffectiveAmount(expense))
    return totals
  }, new Map())

  return Array.from(totalsByCategory.entries())
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((left, right) => right.total - left.total)
}

export const getPersonSummary = (expenses, person1, person2, year, month) => {
  const monthExpenses = getMonthExpenses(expenses, year, month)
  const summary = {
    [person1]: { paid: 0, owed: 0, net: 0 },
    [person2]: { paid: 0, owed: 0, net: 0 },
  }

  monthExpenses.forEach((expense) => {
    const amount = parseFloat(expense.amount || 0)
    const payer = summary[expense.whoPaid]

    if (payer) {
      payer.paid += amount
    }

    if (expense.splitType === 'split') {
      summary[person1].owed += amount / 2
      summary[person2].owed += amount / 2
    } else if (summary[expense.whoPaid]) {
      summary[expense.whoPaid].owed += amount
    }
  })

  summary[person1].net = summary[person1].paid - summary[person1].owed
  summary[person2].net = summary[person2].paid - summary[person2].owed

  return summary
}

export const getPersonTotal = (expenses, person, year, month) => {
  return expenses
    .filter((exp) => {
      const expDate = new Date(exp.date)
      return (
        exp.whoPaid === person &&
        expDate.getFullYear() === year &&
        expDate.getMonth() === month
      )
    })
    .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
}

export const calculateBalance = (expenses, person1, person2, year, month) => {
  const summary = getPersonSummary(expenses, person1, person2, year, month)
  const person1Net = summary[person1].net
  const person2Net = summary[person2].net
  const difference = Math.abs(person1Net - person2Net)

  if (person1Net > person2Net) {
    return { owes: person2, owed: person1, amount: difference }
  } else if (person2Net > person1Net) {
    return { owes: person1, owed: person2, amount: difference }
  }
  return { owes: null, owed: null, amount: 0 }
}

export const formatCurrency = (amount, currency = '€') => {
  return `${currency}${parseFloat(amount || 0).toFixed(2)}`
}

export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

export const getNextRecurringDate = (dateString, frequency = 'monthly') => {
  const nextDate = new Date(dateString)

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    case 'monthly':
    default:
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
  }

  return nextDate.toISOString()
}

export const applyRecurringTransactions = (expenses, today = new Date()) => {
  const currentDate = new Date(today)
  const todayValue = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())

  const generated = []
  const updatedExpenses = expenses.map((expense) => {
    if (!expense.isRecurring || !expense.nextDueDate) {
      return expense
    }

    const dueDate = new Date(expense.nextDueDate)
    const dueValue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())

    if (dueValue <= todayValue) {
      generated.push({
        ...expense,
        id: `${expense.id}-generated-${Date.now()}`,
        date: dueDate.toISOString(),
        nextDueDate: getNextRecurringDate(expense.nextDueDate, expense.recurringFrequency || 'monthly'),
      })

      return {
        ...expense,
        nextDueDate: getNextRecurringDate(expense.nextDueDate, expense.recurringFrequency || 'monthly'),
      }
    }

    return expense
  })

  return { expenses: updatedExpenses, generated }
}
