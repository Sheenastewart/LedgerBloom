import { describe, expect, it } from 'vitest'
import { ApiClientError, parseApiError, toApiClientError } from './ApiClientError'

describe('ApiClientError helpers', () => {
  it('parses a structured backend error body', async () => {
    const response = new Response(
      JSON.stringify({
        message: "A category with name 'Groceries' already exists",
        code: 'CATEGORY_NAME_ALREADY_EXISTS',
        status: 409,
        fieldErrors: [{ field: 'name', message: 'taken' }],
      }),
      { status: 409 },
    )

    const error = await parseApiError(response)
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error.message).toBe("A category with name 'Groceries' already exists")
    expect(error.code).toBe('CATEGORY_NAME_ALREADY_EXISTS')
    expect(error.status).toBe(409)
    expect(error.fieldErrors).toEqual([{ field: 'name', message: 'taken' }])
  })

  it('falls back to a generic message when the body is not structured', async () => {
    const response = new Response('internal boom', { status: 500 })
    const error = await parseApiError(response)
    expect(error.message).toBe('Something went wrong. Please try again.')
    expect(error.code).toBe('UNEXPECTED_ERROR')
  })

  it('distinguishes abort errors from network failures', () => {
    const aborted = toApiClientError(new DOMException('Aborted', 'AbortError'))
    expect(aborted.aborted).toBe(true)
    expect(aborted.code).toBe('ABORTED')

    const network = toApiClientError(new TypeError('Failed to fetch'))
    expect(network.aborted).toBe(false)
    expect(network.code).toBe('NETWORK_ERROR')
    expect(network.message).toBe('Unable to reach the API. Please try again.')
  })
})
