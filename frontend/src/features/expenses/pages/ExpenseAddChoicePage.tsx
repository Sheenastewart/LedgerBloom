import { Link } from 'react-router-dom'
import { paths } from '../../../routes/paths'
import '../expenses.css'
import '../../categories/categories.css'
import '../../income/income.css'

/**
 * First step when adding an expense: one-time entry vs recurring schedule.
 */
export function ExpenseAddChoicePage() {
  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Add expense</h1>
          <p className="page-subtitle">Is this recurring?</p>
        </div>
        <Link to={paths.transactionsExpenses} className="button button-secondary">
          Back to expenses
        </Link>
      </div>

      <ul className="income-add-choices">
        <li>
          <Link
            to={paths.transactionsExpensesNew}
            className="income-add-choice"
            aria-label="One-time"
          >
            <h2>One-time</h2>
            <p>
              Record a single purchase or bill payment, such as groceries, gas, or a one-off
              fee.
            </p>
            <span className="income-add-choice-cta">Continue</span>
          </Link>
        </li>

        <li>
          <Link
            to={paths.transactionsRecurringExpenseNew}
            className="income-add-choice"
            aria-label="Recurring schedule"
          >
            <h2>Recurring</h2>
            <p>
              Set up a repeating bill or subscription so upcoming payments stay on your
              schedule.
            </p>
            <span className="income-add-choice-cta">Continue</span>
          </Link>
        </li>
      </ul>
    </main>
  )
}
