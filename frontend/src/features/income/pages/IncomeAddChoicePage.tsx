import { Link } from 'react-router-dom'
import '../income.css'
import '../../categories/categories.css'

/**
 * Lightweight choice screen so users pick one-time vs recurring income
 * without needing to understand the internal data model.
 */
export function IncomeAddChoicePage() {
  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Add income</h1>
          <p className="page-subtitle">What kind of income are you adding?</p>
        </div>
        <Link to="/income" className="button button-secondary">
          Back to income
        </Link>
      </div>

      <ul className="income-add-choices">
        <li>
          <Link to="/income/new" className="income-add-choice" aria-label="One-time income">
            <h2>One-time income</h2>
            <p>
              Record money you received once, such as a refund, bonus, or one-time
              payment.
            </p>
            <span className="income-add-choice-cta">Add One-Time Income</span>
          </Link>
        </li>

        <li>
          <Link
            to="/recurring-income/new"
            className="income-add-choice"
            aria-label="Recurring income"
          >
            <h2>Recurring income</h2>
            <p>
              Set up income received on a repeating schedule, such as weekly,
              biweekly, or monthly pay.
            </p>
            <span className="income-add-choice-cta">Add Recurring Income</span>
          </Link>
        </li>
      </ul>
    </main>
  )
}
