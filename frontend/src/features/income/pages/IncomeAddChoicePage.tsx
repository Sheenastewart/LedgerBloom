import { Link } from 'react-router-dom'
import '../income.css'
import '../../categories/categories.css'

/**
 * First step when adding income: one-time receipt vs recurring schedule.
 */
export function IncomeAddChoicePage() {
  return (
    <main className="content-page">
      <div className="page-header">
        <div>
          <h1>Add income</h1>
          <p className="page-subtitle">Is this recurring?</p>
        </div>
        <Link to="/income" className="button button-secondary">
          Back to income
        </Link>
      </div>

      <ul className="income-add-choices">
        <li>
          <Link to="/income/new" className="income-add-choice" aria-label="One-time">
            <h2>One-time</h2>
            <p>
              Record money you received once, such as a refund, bonus, or one-time
              payment.
            </p>
            <span className="income-add-choice-cta">Continue</span>
          </Link>
        </li>

        <li>
          <Link
            to="/recurring-income/new"
            className="income-add-choice"
            aria-label="Recurring schedule"
          >
            <h2>Recurring</h2>
            <p>
              Set up income received on a repeating schedule, such as weekly,
              biweekly, or monthly pay.
            </p>
            <span className="income-add-choice-cta">Continue</span>
          </Link>
        </li>
      </ul>
    </main>
  )
}
