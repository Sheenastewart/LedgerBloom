import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActionMenu } from './ActionMenu'

describe('ActionMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('toggles aria-expanded and closes on Escape', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <MemoryRouter>
        <ActionMenu
          label="Actions for Coffee"
          items={[
            { id: 'edit', label: 'Edit', to: '/edit' },
            { id: 'delete', label: 'Delete', kind: 'danger', onSelect: onDelete },
          ]}
        />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: 'Actions for Coffee' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: 'Actions for Coffee' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
