import { Link } from 'react-router-dom'
import { CategoryIcon, IconIncome } from './icons/categoryIcons'
import { relativeDateLabel } from '../utils/relativeDate'
import { formatCurrency } from '../utils/moneyUtils'

export type ActivityRowItem = {
  id: string
  kind: 'expense' | 'income'
  title: string
  merchant?: string | null
  categoryName: string
  date: string
  amount: number
  href?: string
  recurring?: boolean
}

type ActivityRowListProps = {
  items: ActivityRowItem[]
  emptyMessage?: string
  todayIso?: string
}

export function ActivityRowList({
  items,
  emptyMessage = 'No recent activity.',
  todayIso,
}: ActivityRowListProps) {
  if (items.length === 0) {
    return (
      <p className="dashboard-empty" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ul className="activity-list" aria-label="Recent activity">
      {items.map((item) => {
        const content = (
          <>
            <span className={`activity-row__icon activity-row__icon--${item.kind}`}>
              {item.kind === 'income' ? <IconIncome /> : <CategoryIcon categoryName={item.categoryName} />}
            </span>
            <span className="activity-row__main">
              <span className="activity-row__title-row">
                <span className="activity-row__title">{item.title}</span>
                {item.recurring ? <span className="activity-badge">Recurring</span> : null}
                {item.kind === 'income' ? (
                  <span className="activity-badge activity-badge--income">Income</span>
                ) : null}
              </span>
              <span className="activity-row__meta">
                {item.merchant ? `${item.merchant} · ` : null}
                {relativeDateLabel(item.date, todayIso)}
                {item.kind === 'expense' ? ` · ${item.categoryName}` : null}
              </span>
            </span>
            <span
              className={`activity-row__amount numeric ${
                item.kind === 'income' ? 'is-income' : 'is-expense'
              }`}
            >
              {item.kind === 'income' ? '+' : '−'}
              {formatCurrency(item.amount)}
            </span>
          </>
        )

        return (
          <li key={item.id} className="activity-row">
            {item.href ? (
              <Link to={item.href} className="activity-row__link">
                {content}
              </Link>
            ) : (
              <div className="activity-row__link activity-row__link--static">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
