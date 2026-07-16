import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HELP_CATEGORIES, HELP_TOPICS } from '../helpContent'
import { HelpPage } from './HelpPage'

function renderHelp(initialEntry = '/settings/help') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/settings/help" element={<HelpPage />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/budgets" element={<p>Budgets page</p>} />
        <Route path="/reports" element={<p>Reports page</p>} />
        <Route path="/transactions/categories" element={<p>Categories page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HelpPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders topic sections', () => {
    renderHelp()
    expect(screen.getByRole('heading', { name: 'Help', level: 1 })).toBeInTheDocument()
    for (const category of HELP_CATEGORIES.slice(0, 5)) {
      expect(screen.getByRole('heading', { name: category.title, level: 2 })).toBeInTheDocument()
    }
    expect(screen.getByRole('status')).toHaveTextContent(`${HELP_TOPICS.length} articles available`)
  })

  it('filters by title case-insensitively', async () => {
    const user = userEvent.setup()
    renderHelp()
    await user.type(screen.getByLabelText('Search help'), 'NET CASH FLOW')
    expect(screen.getByRole('button', { name: 'What net cash flow means' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'How to create a category' })).not.toBeInTheDocument()
  })

  it('filters by keyword and content', async () => {
    const user = userEvent.setup()
    renderHelp()
    await user.type(screen.getByLabelText('Search help'), 'RESOURCE_NOT_FOUND')
    expect(
      screen.getByRole('button', { name: 'Why an unknown API path returns 404' }),
    ).toBeInTheDocument()
  })

  it('shows no-results state and clears search', async () => {
    const user = userEvent.setup()
    renderHelp()
    await user.type(screen.getByLabelText('Search help'), 'zzzz-not-a-topic')
    expect(screen.getByText('No help articles match your search.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByRole('status')).toHaveTextContent(`${HELP_TOPICS.length} articles available`)
  })

  it('opens a related page link from an article', async () => {
    const user = userEvent.setup()
    renderHelp('/settings/help?topic=what-is-dashboard')
    const article = document.getElementById('what-is-dashboard')
    expect(article).not.toBeNull()
    const toggle = within(article as HTMLElement).getByRole('button', {
      name: 'What the dashboard shows',
    })
    if (toggle.getAttribute('aria-expanded') === 'false') {
      await user.click(toggle)
    }
    await user.click(within(article as HTMLElement).getByRole('link', { name: 'Open dashboard' }))
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
  })

  it('prefilters with q query parameter', () => {
    renderHelp('/settings/help?q=csv')
    expect(screen.getByLabelText('Search help')).toHaveValue('csv')
    expect(screen.getByRole('button', { name: 'How to export CSV files' })).toBeInTheDocument()
  })
})
