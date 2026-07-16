import { ApiClientError, requestJson } from '../../../api/apiClient'
import type {
  CategoryLimitCreateRequest,
  CategoryLimitUpdateRequest,
  MonthlyBudget,
  MonthlyBudgetUpdateRequest,
  MonthlyBudgetWriteRequest,
  BudgetPeriod,
} from '../types'

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
