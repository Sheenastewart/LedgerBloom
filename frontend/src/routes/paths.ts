/** Canonical app paths for the navigation architecture. */
export const paths = {
  home: '/',
  dashboard: '/dashboard',

  transactions: '/transactions',
  transactionsExpenses: '/transactions/expenses',
  transactionsExpensesAdd: '/transactions/expenses/add',
  transactionsExpensesNew: '/transactions/expenses/new',
  transactionsExpenseEdit: (id: number | string) => `/transactions/expenses/${id}/edit`,

  transactionsIncome: '/transactions/income',
  transactionsIncomeAdd: '/transactions/income/add',
  transactionsIncomeNew: '/transactions/income/new',
  transactionsIncomeEdit: (id: number | string) => `/transactions/income/${id}/edit`,

  transactionsRecurringExpenses: '/transactions/recurring-expenses',
  transactionsRecurringExpenseNew: '/transactions/recurring-expenses/new',
  transactionsRecurringExpenseEdit: (id: number | string) =>
    `/transactions/recurring-expenses/${id}/edit`,

  transactionsRecurringIncome: '/transactions/recurring-income',
  transactionsRecurringIncomeNew: '/transactions/recurring-income/new',
  transactionsRecurringIncomeEdit: (id: number | string) =>
    `/transactions/recurring-income/${id}/edit`,

  transactionsCategories: '/transactions/categories',
  transactionsCategoryNew: '/transactions/categories/new',
  transactionsCategoryEdit: (id: number | string) => `/transactions/categories/${id}/edit`,

  budgets: '/budgets',
  budgetsMonthly: '/budgets/monthly',
  budgetsCategories: '/budgets/categories',
  budgetsNew: '/budgets/new',
  budgetEdit: (id: number | string) => `/budgets/${id}/edit`,

  reports: '/reports',
  reportsMonthly: '/reports/monthly',
  reportsTrends: '/reports/trends',
  reportsYtd: '/reports/year-to-date',
  reportsCashFlow: '/reports/cash-flow',
  reportsExports: '/reports/exports',

  settings: '/settings',
  settingsAccount: '/settings/account',
  settingsHelp: '/settings/help',
  settingsSecurity: '/settings/security',
  settingsPreferences: '/settings/preferences',
  settingsAbout: '/settings/about',

  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
} as const
