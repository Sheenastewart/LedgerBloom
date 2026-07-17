import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
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
  { id: 'bud', label: 'Monthly budget', group: 'Budgets', to: paths.budgetsMonthly },
  { id: 'bud-cat', label: 'Categories', group: 'Budgets', to: paths.budgetsCategories },
  { id: 'rep-m', label: 'Monthly report', group: 'Reports', to: paths.reportsMonthly },
  { id: 'rep-t', label: 'Trends', group: 'Reports', to: paths.reportsTrends },
  { id: 'rep-y', label: 'Year-to-date', group: 'Reports', to: paths.reportsYtd },
  { id: 'rep-review', label: 'Monthly review', group: 'Reports', to: paths.reportsReview },
  { id: 'rep-insights', label: 'Insights', group: 'Reports', to: paths.reportsInsights },
  { id: 'rep-x', label: 'Exports', group: 'Reports', to: paths.reportsExports },
  { id: 'set-account', label: 'Account settings', group: 'Settings', to: paths.settingsAccount },
  { id: 'set-security', label: 'Security', group: 'Settings', to: paths.settingsSecurity },
  {
    id: 'set-prefs',
    label: 'Preferences',
    group: 'Settings',
    to: paths.settingsPreferences,
  },
  { id: 'set-about', label: 'About LedgerBloom', group: 'Settings', to: paths.settingsAbout },
  { id: 'help', label: 'Help Center', group: 'Help', to: paths.settingsHelp },
  ...HELP_TOPICS.slice(0, 12).map((topic) => ({
    id: `help-${topic.id}`,
    label: topic.title,
    group: 'Help',
    to: `${paths.settingsHelp}?topic=${topic.id}`,
    keywords: topic.summary,
  })),
]

function shortcutLabel(): string {
  if (typeof navigator === 'undefined') {
    return '⌘K'
  }
  const platform = navigator.platform ?? ''
  const isApple = /Mac|iPhone|iPad|iPod/i.test(platform)
  return isApple ? '⌘K' : 'Ctrl+K'
}

type GlobalSearchProps = {
  extraItems?: SearchItem[]
}

export function GlobalSearch({ extraItems = [] }: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [kbdLabel] = useState(shortcutLabel)

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
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setActiveIndex(0)
    } else {
      setQuery('')
      setActiveIndex(0)
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

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
      return
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      const link = rootRef.current?.querySelector<HTMLAnchorElement>(
        `[data-search-index="${activeIndex}"]`,
      )
      link?.click()
    }
  }

  return (
    <div className="global-search" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="global-search__trigger"
        aria-expanded={open}
        aria-controls={inputId}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        Search
        <kbd className="global-search__kbd">{kbdLabel}</kbd>
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
            placeholder="Search pages, reports, settings, help…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            aria-autocomplete="list"
            aria-controls={`${inputId}-results`}
          />
          <ul id={`${inputId}-results`} className="global-search__results" role="listbox">
            {results.map((item, index) => (
              <li key={item.id} role="option" aria-selected={index === activeIndex}>
                <Link
                  to={item.to}
                  className={`global-search__result${index === activeIndex ? ' is-active' : ''}`}
                  data-search-index={index}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <span>{item.label}</span>
                  <span className="global-search__group">{item.group}</span>
                </Link>
              </li>
            ))}
            {results.length === 0 ? (
              <li className="global-search__empty" role="status">
                No matches. Try a page name like “Budget” or “Trends”.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
