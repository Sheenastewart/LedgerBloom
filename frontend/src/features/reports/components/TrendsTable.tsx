import { formatCurrency } from '../../../utils/moneyUtils'
import { budgetStatus, budgetStatusLabel } from '../../budgets/budgetStatus'
import { monthLabel } from '../reportsFormat'
import type { MonthlyComparisonItem } from '../types'

type TrendsTableProps = {
  months: MonthlyComparisonItem[]
  caption?: string
}

function budgetStatusText(item: MonthlyComparisonItem): string {
  if (item.overBudget === null || item.budgetPercentUsed === null) {
    return 'No budget'
  }
  return budgetStatusLabel(budgetStatus(item.overBudget, item.budgetPercentUsed))
}

function budgetStatusClass(item: MonthlyComparisonItem): string {
  if (item.overBudget === null || item.budgetPercentUsed === null) {
    return ''
  }
  return budgetStatus(item.overBudget, item.budgetPercentUsed)
}

export function TrendsTable({ months, caption }: TrendsTableProps) {
  return (
    <div className="reports-table-wrap">
      <table className="reports-table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col" className="numeric">
              Income
            </th>
            <th scope="col" className="numeric">
              Expenses
            </th>
            <th scope="col" className="numeric">
              Net cash flow
            </th>
            <th scope="col">Budget status</th>
            <th scope="col" className="numeric">
              Projected income
            </th>
          </tr>
        </thead>
        <tbody>
          {months.map((item) => {
            const projectedIncome = item.totalIncome + item.expectedRecurringIncome
            return (
              <tr key={`${item.year}-${item.month}`}>
                <th scope="row">{monthLabel(item)}</th>
                <td className="numeric">{formatCurrency(item.totalIncome)}</td>
                <td className="numeric">{formatCurrency(item.totalExpenses)}</td>
                <td className={item.netCashFlow < 0 ? 'numeric negative' : 'numeric'}>
                  {formatCurrency(item.netCashFlow)}
                </td>
                <td>
                  <span className={`budget-status ${budgetStatusClass(item)}`}>
                    {budgetStatusText(item)}
                  </span>
                </td>
                <td className="numeric">{formatCurrency(projectedIncome)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
