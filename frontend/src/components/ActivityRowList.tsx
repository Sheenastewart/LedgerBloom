import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CategoryIcon, IconIncome } from './icons/categoryIcons'
import { resolveCategoryColor, softColorFromHex } from '../utils/categoryColor'
import { relativeDateLabel } from '../utils/relativeDate'
import { formatCurrency } from '../utils/moneyUtils'

export type ActivityRowItem = {
  id: string
  kind: 'expense' | 'income'
  title: string
  /** Optional line under the title (expense payment source or income origin). */
  subtitle?: string | null
  categoryName: string
  /** Optional stored category color (#RRGGBB); falls back to a name-based accent. */
  categoryColor?: string | null
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
        const metaParts = [
          relativeDateLabel(item.date, todayIso),
          item.kind === 'expense' ? item.categoryName : null,
          item.kind === 'expense' && item.subtitle ? `Paid from ${item.subtitle}` : null,
          item.kind === 'income' && item.subtitle ? `From ${item.subtitle}` : null,
        ].filter(Boolean)

        const accent =
          item.kind === 'income'
            ? undefined
            : resolveCategoryColor(item.categoryName, item.categoryColor)

        const accentStyle =
          accent != null
            ? ({
                ['--row-accent' as string]: accent,
                ['--row-accent-soft' as string]: softColorFromHex(accent),
              } as CSSProperties)
            : undefined

        const content = (
          <>
            <span
              className={`activity-row__icon activity-row__icon--${item.kind}`}
              style={accentStyle}
            >
              {item.kind === 'income' ? (
                <IconIncome />
              ) : (
                <CategoryIcon categoryName={item.categoryName} />
              )}
            </span>
            <span className="activity-row__main">
              <span className="activity-row__title-row">
                <span className="activity-row__title">{item.title}</span>
                {item.recurring ? <span className="activity-badge">Recurring</span> : null}
                {item.kind === 'income' ? (
                  <span className="activity-badge activity-badge--income">Income</span>
                ) : (
                  <span className="activity-badge activity-badge--expense">Expense</span>
                )}
              </span>
              <span className="activity-row__meta">{metaParts.join(' · ')}</span>
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
          <li
            key={item.id}
            className={`activity-row activity-row--${item.kind}`}
            style={accentStyle}
          >
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
