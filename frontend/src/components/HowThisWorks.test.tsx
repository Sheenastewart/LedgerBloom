import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { HowThisWorks } from './HowThisWorks'

describe('HowThisWorks', () => {
  afterEach(() => {
    cleanup()
  })

  it('is collapsed by default and expands with aria-expanded', async () => {
    const user = userEvent.setup()
    render(
      <HowThisWorks>
        <p>Actual totals come from saved entries.</p>
      </HowThisWorks>,
    )

    const toggle = screen.getByRole('button', { name: 'How this works' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Actual totals come from saved entries.')).not.toBeInTheDocument()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Actual totals come from saved entries.')).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Actual totals come from saved entries.')).not.toBeInTheDocument()
  })
})
