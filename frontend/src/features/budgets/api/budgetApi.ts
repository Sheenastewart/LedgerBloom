import { ApiClientError, requestJson } from '../../../api/apiClient'
import type {
  GroupLimitCreateRequest,
  GroupLimitUpdateRequest,
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

export async function generateMonthlyBudget(period: BudgetPeriod): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>('/api/budgets/monthly/generate', {
    method: 'POST',
    body: JSON.stringify({ year: period.year, month: period.month }),
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

export async function createGroupLimit(
  budgetId: number,
  body: GroupLimitCreateRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/groups`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateGroupLimit(
  budgetId: number,
  limitId: number,
  body: GroupLimitUpdateRequest,
): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/groups/${limitId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deleteGroupLimit(budgetId: number, limitId: number): Promise<MonthlyBudget> {
  return requestJson<MonthlyBudget>(`/api/budgets/monthly/${budgetId}/groups/${limitId}`, {
    method: 'DELETE',
  })
}

export { ApiClientError }
