import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import { HELP_TOPICS } from '../features/guidance/helpContent'
import './globalSearch.css'

type SearchItem = {
  id: string
  label: string
  group: string
  to: string
  keywords?: string
}

const STATIC_ITEMS: SearchItem[] = [
  { id: 'dash', label: 'Dashboard', group: 'Pages', to: paths.dashboard },
  { id: 'tx-all', label: 'All transactions', group: 'Transactions', to: paths.transactionsAll },
  { id: 'tx-exp', label: 'Expenses', group: 'Transactions', to: paths.transactionsExpenses },
  { id: 'tx-inc', label: 'Income', group: 'Transactions', to: paths.transactionsIncome },
  { id: 'tx-re', label: 'Recurring expenses', group: 'Transactions', to: paths.transactionsRecurringExpenses },
  { id: 'tx-ri', label: 'Recurring income', group: 'Transactions', to: paths.transactionsRecurringIncome },
  { id: 'tx-cat', label: 'Categories', group: 'Transactions', to: paths.transactionsCategories },
  { id: 'bud', label: 'Monthly budget', group: 'Budgets', to: paths.budgetsMonthly },
  { id: 'bud-cat', label: 'Budget categories', group: 'Budgets', to: paths.budgetsCategories },
  { id: 'rep-m', label: 'Monthly report', group: 'Reports', to: paths.reportsMonthly },
  { id: 'rep-t', label: 'Trends', group: 'Reports', to: paths.reportsTrends },
  { id: 'rep-y', label: 'Year-to-date', group: 'Reports', to: paths.reportsYtd },
  { id: 'rep-review', label: 'Monthly review', group: 'Reports', to: paths.reportsReview },
  { id: 'rep-insights', label: 'Insights', group: 'Reports', to: paths.reportsInsights },
  { id: 'rep-x', label: 'Exports', group: 'Reports', to: paths.reportsExports },
  { id: 'help', label: 'Help', group: 'Help', to: paths.settingsHelp },
  ...HELP_TOPICS.slice(0, 12).map((topic) => ({
    id: `help-${topic.id}`,
    label: topic.title,
    group: 'Help',
    to: `${paths.settingsHelp}?topic=${topic.id}`,
    keywords: topic.summary,
  })),
]

type GlobalSearchProps = {
  extraItems?: SearchItem[]
}

export function GlobalSearch({ extraItems = [] }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const catalog = useMemo(() => [...STATIC_ITEMS, ...extraItems], [extraItems])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog.slice(0, 8)
    return catalog
      .filter((item) => {
        const hay = `${item.label} ${item.group} ${item.keywords ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 12)
  }, [catalog, query])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    } else {
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  return (
    <div className="global-search" ref={rootRef}>
      <button
        type="button"
        className="global-search__trigger"
        aria-expanded={open}
        aria-controls={inputId}
        onClick={() => setOpen(true)}
      >
        Search
        <kbd className="global-search__kbd">⌘K</kbd>
      </button>
      {open ? (
        <div className="global-search__panel" role="dialog" aria-label="Search LedgerBloom">
          <label className="visually-hidden" htmlFor={inputId}>
            Search
          </label>
          <input
            ref={inputRef}
            id={inputId}
            className="global-search__input"
            type="search"
            placeholder="Search pages, reports, help…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          <ul className="global-search__results">
            {results.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="global-search__result"
                  onClick={() => setOpen(false)}
                >
                  <span>{item.label}</span>
                  <span className="global-search__group">{item.group}</span>
                </Link>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="global-search__empty">No matches.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
