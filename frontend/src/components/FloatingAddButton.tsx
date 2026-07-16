import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { paths } from '../routes/paths'
import './floatingAdd.css'

const ACTIONS = [
  { id: 'expense', label: 'Expense', to: paths.transactionsExpensesAdd },
  { id: 'income', label: 'Income', to: paths.transactionsIncomeAdd },
  { id: 'recurring-expense', label: 'Recurring Expense', to: paths.transactionsRecurringExpenseNew },
  { id: 'recurring-income', label: 'Recurring Income', to: paths.transactionsRecurringIncomeNew },
  { id: 'budget', label: 'Budget', to: paths.budgetsNew },
] as const

export function FloatingAddButton() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div className="floating-add" ref={rootRef}>
      {open ? (
        <div className="floating-add__menu" id={menuId} role="menu" aria-label="Add new">
          {ACTIONS.map((action) => (
            <Link
              key={action.id}
              role="menuitem"
              className="floating-add__item"
              to={action.to}
              onClick={() => setOpen(false)}
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="floating-add__button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-label={open ? 'Close add menu' : 'Add new'}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? '×' : '+'}</span>
      </button>
    </div>
  )
}
