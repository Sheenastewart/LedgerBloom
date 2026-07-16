import { ApiClientError, requestJson } from '../../../api/apiClient'
import type { Expense, ExpenseFilters, ExpenseWriteRequest } from '../types'

function buildExpensesQuery(filters: ExpenseFilters): string {
  const params = new URLSearchParams()

  if (filters.year !== undefined && filters.month !== undefined) {
    params.set('year', String(filters.year))
    params.set('month', String(filters.month))
  }

  if (filters.categoryId !== undefined) {
    params.set('categoryId', String(filters.categoryId))
  }

  const query = params.toString()
  return query.length > 0 ? `?${query}` : ''
}

export async function getExpenses(
  filters: ExpenseFilters = {},
  signal?: AbortSignal,
): Promise<Expense[]> {
  return requestJson<Expense[]>(`/api/expenses${buildExpensesQuery(filters)}`, {
    method: 'GET',
    signal,
  })
}

export async function getExpense(id: number, signal?: AbortSignal): Promise<Expense> {
  return requestJson<Expense>(`/api/expenses/${id}`, { method: 'GET', signal })
}

export async function createExpense(body: ExpenseWriteRequest): Promise<Expense> {
  return requestJson<Expense>('/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateExpense(id: number, body: ExpenseWriteRequest): Promise<Expense> {
  return requestJson<Expense>(`/api/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteExpense(id: number): Promise<void> {
  await requestJson<void>(`/api/expenses/${id}`, { method: 'DELETE' })
}

export { ApiClientError }
