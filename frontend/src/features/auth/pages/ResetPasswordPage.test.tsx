import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/authApi'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../api/authApi', () => ({ resetPassword: vi.fn() }))

describe('ResetPasswordPage', () => {
  afterEach(() => cleanup())

  it('uses the token from the query string', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.resetPassword).mockResolvedValue({ message: 'Password reset' })
    render(<MemoryRouter initialEntries={['/reset-password?token=reset-token']}><ResetPasswordPage /></MemoryRouter>)

    await user.type(screen.getByLabelText('New password'), 'supersecret12')
    await user.type(screen.getByLabelText('Confirm new password'), 'supersecret12')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'supersecret12',
      confirmNewPassword: 'supersecret12',
    })
  })

  it('validates the 12 character password policy', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/reset-password?token=reset-token']}><ResetPasswordPage /></MemoryRouter>)

    await user.type(screen.getByLabelText('New password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Reset password' }))

    expect(await screen.findByText('Password must be at least 12 characters')).toBeInTheDocument()
  })
})
