import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAbortError } from '../../../api/ApiClientError'
import { ActivityRowList, type ActivityRowItem } from '../../../components/ActivityRowList'
import { ErrorPanel, LoadingState } from '../../../components/ui/Feedback'
import { expenseDisplayTitle } from '../../../utils/expenseDisplay'
import { paths } from '../../../routes/paths'
import { getExpenses } from '../../expenses/api/expenseApi'
import type { Expense } from '../../expenses/types'
import { getIncomeEntries } from '../../income/api/incomeApi'
import type { IncomeEntry } from '../../income/types'
import { DashboardPeriodForm } from '../../dashboard/components/DashboardPeriodForm'
import type { DashboardPeriod } from '../../dashboard/types'
import '../../dashboard/dashboard.css'
import '../../expenses/expenses.css'

function currentPeriod(): DashboardPeriod {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function TransactionsAllPage() {
  const [period, setPeriod] = useState<DashboardPeriod>(currentPeriod)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [incomes, setIncomes] = useState<IncomeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextPeriod: DashboardPeriod, signal?: AbortSignal) => {
    setLoading(true)
    setError(null)
    try {
      const [expenseData, incomeData] = await Promise.all([
        getExpenses({ year: nextPeriod.year, month: nextPeriod.month }, signal),
        getIncomeEntries({ year: nextPeriod.year, month: nextPeriod.month }, signal),
      ])
      if (signal?.aborted) return
      setExpenses(expenseData)
      setIncomes(incomeData)
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return
      setError('Unable to load transactions. Please try again.')
      setExpenses([])
      setIncomes([])
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(period, controller.signal)
    return () => controller.abort()
  }, [load, period])

  const items = useMemo<ActivityRowItem[]>(() => {
    const expenseItems: ActivityRowItem[] = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      kind: 'expense',
      title: expenseDisplayTitle(expense.description, expense.category.name),
      merchant: expense.merchant,
      categoryName: expense.category.name,
      date: expense.expenseDate,
      amount: expense.amount,
      href: paths.transactionsExpenseEdit(expense.id),
      recurring: false,
    }))
    const incomeItems: ActivityRowItem[] = incomes.map((income) => ({
      id: `income-${income.id}`,
      kind: 'income',
      title: income.description,
      merchant: income.source,
      categoryName: income.source,
      date: income.incomeDate,
      amount: income.amount,
      href: paths.transactionsIncomeEdit(income.id),
      recurring: income.recurringIncomeId != null,
    }))
    return [...expenseItems, ...incomeItems].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : a.id.localeCompare(b.id),
    )
  }, [expenses, incomes])

  return (
    <main className="content-page">
      <div className="page-header page-header--compact">
        <div>
          <h2 className="page-title-secondary">All activity</h2>
          <p className="page-subtitle">Expenses and income for the selected month, newest first.</p>
        </div>
        <div className="page-header__actions">
          <Link to={paths.transactionsExpensesAdd} className="button button-primary">
            Add expense
          </Link>
          <Link to={paths.transactionsIncomeAdd} className="button button-secondary">
            Add income
          </Link>
        </div>
      </div>

      <DashboardPeriodForm appliedPeriod={period} onApply={setPeriod} />

      {error ? <ErrorPanel onRetry={() => void load(period)}>{error}</ErrorPanel> : null}
      {loading ? <LoadingState>Loading transactions…</LoadingState> : null}

      {!loading && !error ? (
        <section className="lb-surface" aria-label="All transactions">
          <ActivityRowList
            items={items}
            emptyMessage="No expenses or income in this month yet."
          />
        </section>
      ) : null}
    </main>
  )
}
