import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as accountApi from '../../account/api/accountApi'
import { SettingsAccountPage } from './SettingsAccountPage'

const refreshMe = vi.fn()
const logout = vi.fn()

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'user@example.com', displayName: 'Jane Doe', createdAt: '', lastLoginAt: null },
    refreshMe,
    logout,
  }),
}))
vi.mock('../../account/api/accountApi', () => ({
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}))

describe('SettingsAccountPage', () => {
  afterEach(() => cleanup())

  it('updates the profile and refreshes the signed-in user', async () => {
    const user = userEvent.setup()
    vi.mocked(accountApi.updateProfile).mockResolvedValue({
      id: 1, email: 'user@example.com', displayName: 'Jane Smith', createdAt: '', lastLoginAt: null,
    })
    refreshMe.mockResolvedValue(undefined)
    render(<MemoryRouter><SettingsAccountPage /></MemoryRouter>)

    const displayName = screen.getByLabelText('Display name')
    await user.clear(displayName)
    await user.type(displayName, 'Jane Smith')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(accountApi.updateProfile).toHaveBeenCalledWith({ displayName: 'Jane Smith' })
    expect(refreshMe).toHaveBeenCalled()
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
  })

  it('validates password confirmation before submitting', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><SettingsAccountPage /></MemoryRouter>)

    await user.type(screen.getByLabelText('Current password'), 'supersecret12')
    await user.type(screen.getByLabelText('New password'), 'anothersecret12')
    await user.type(screen.getByLabelText('Confirm new password'), 'not-a-match')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Passwords must match')).toBeInTheDocument()
    expect(accountApi.changePassword).not.toHaveBeenCalled()
  })
})
