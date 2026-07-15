import { ApiClientError, parseApiError, toApiClientError } from '../../../api/ApiClientError'
import type {
  CategoryLimitCreateRequest,
  CategoryLimitUpdateRequest,
  MonthlyBudget,
  MonthlyBudgetUpdateRequest,
  MonthlyBudgetWriteRequest,
  BudgetPeriod,
} from '../types'

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })

    if (!response.ok) {
      throw await parseApiError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function getMonthlyBudget(
  period: BudgetPeriod,
  signal?: AbortSignal,
): Promise<MonthlyBudget> {
  const params = new URLSearchParams({
    year: String(period.year),
    month: String(period.month),
  })
  return requestJson<MonthlyBudget>(`/api/budgets/monthly?${params.toString()}`, {
    method: 'GET',
    signal,
  })
}

export async function createMonthlyBudget(
  body: MonthlyBudgetWriteRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>('/api/budgets/monthly', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateMonthlyBudget(
  id: number,
  body: MonthlyBudgetUpdateRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteMonthlyBudget(id: number): Promise<void> {
  await requestJson<void>(`/api/budgets/monthly/${id}`, { method: 'DELETE' })
}

export async function createCategoryLimit(
  budgetId: number,
  body: CategoryLimitCreateRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/categories`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateCategoryLimit(
  budgetId: number,
  limitId: number,
  body: CategoryLimitUpdateRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/categories/${limitId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteCategoryLimit(budgetId: number, limitId: number): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/categories/${limitId}`, {
    method: 'DELETE',
  })
}

export { ApiClientError }
