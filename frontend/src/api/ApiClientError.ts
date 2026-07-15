export type FieldErrorDetail = {
  field: string
  message: string
}

export type ApiErrorBody = {
  timestamp?: string
  status?: number
  error?: string
  code?: string
  message?: string
  path?: string
  fieldErrors?: FieldErrorDetail[] | null
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldErrorDetail[]
  readonly aborted: boolean

  constructor(options: {
    message: string
    status?: number
    code?: string
    fieldErrors?: FieldErrorDetail[]
    aborted?: boolean
  }) {
    super(options.message)
    this.name = 'ApiClientError'
    this.status = options.status ?? 0
    this.code = options.code ?? 'UNEXPECTED_ERROR'
    this.fieldErrors = options.fieldErrors ?? []
    this.aborted = options.aborted ?? false
  }
}

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof ApiClientError && error.aborted) ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError')
  )
}

export async function parseApiError(response: Response): Promise<ApiClientError> {
  let body: ApiErrorBody | null = null

  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    body = null
  }

  const message =
    typeof body?.message === 'string' && body.message.trim().length > 0
      ? body.message
      : GENERIC_ERROR_MESSAGE

  const code =
    typeof body?.code === 'string' && body.code.trim().length > 0
      ? body.code
      : 'UNEXPECTED_ERROR'

  const fieldErrors = Array.isArray(body?.fieldErrors)
    ? body.fieldErrors.filter(
        (item): item is FieldErrorDetail =>
          typeof item?.field === 'string' && typeof item?.message === 'string',
      )
    : []

  return new ApiClientError({
    message,
    status: response.status,
    code,
    fieldErrors,
  })
}

export function toApiClientError(error: unknown): ApiClientError {
  if (isAbortError(error)) {
    return new ApiClientError({
      message: 'Request cancelled',
      aborted: true,
      code: 'ABORTED',
    })
  }

  if (error instanceof ApiClientError) {
    return error
  }

  return new ApiClientError({
    message: 'Unable to reach the API. Please try again.',
    code: 'NETWORK_ERROR',
  })
}
