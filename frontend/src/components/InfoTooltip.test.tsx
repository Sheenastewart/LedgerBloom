import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { InfoTooltip } from './InfoTooltip'

describe('InfoTooltip', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens on click and shows content with an accessible trigger label', async () => {
    const user = userEvent.setup()
    render(
      <InfoTooltip label="About net cash flow">Actual income minus actual expenses.</InfoTooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'About net cash flow' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Actual income minus actual expenses.',
    )
  })

  it('opens on keyboard focus', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip label="About projected income">Projected detail</InfoTooltip>)

    await user.tab()
    expect(screen.getByRole('button', { name: 'About projected income' })).toHaveFocus()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Projected detail')
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip label="About remaining budget">Remaining detail</InfoTooltip>)

    await user.click(screen.getByRole('button', { name: 'About remaining budget' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('closes on outside click', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <InfoTooltip label="About percent used">Percent detail</InfoTooltip>
        <button type="button">Outside</button>
      </div>,
    )

    await user.click(screen.getByRole('button', { name: 'About percent used' }))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
