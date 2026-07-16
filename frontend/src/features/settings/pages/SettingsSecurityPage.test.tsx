import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SettingsSecurityPage } from './SettingsSecurityPage'

describe('SettingsSecurityPage', () => {
  it('explains the account security controls', () => {
    render(<MemoryRouter><SettingsSecurityPage /></MemoryRouter>)

    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByText(/CSRF safeguards/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reset your password' })).toHaveAttribute('href', '/forgot-password')
  })
})
