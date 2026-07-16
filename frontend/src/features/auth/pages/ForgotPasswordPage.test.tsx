import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/authApi'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('../api/authApi', () => ({ forgotPassword: vi.fn() }))

describe('ForgotPasswordPage', () => {
  it('shows the same success message after a request', async () => {
    const user = userEvent.setup()
    vi.mocked(authApi.forgotPassword).mockResolvedValue({ message: 'ignored' })
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)

    await user.type(screen.getByLabelText('Email'), 'user@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset instructions' }))

    expect(await screen.findByText('If an account exists for that email address, we sent password reset instructions.')).toBeInTheDocument()
  })
})
