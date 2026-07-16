import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { ForbiddenPage } from './features/auth/pages/ForbiddenPage'
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage'
import { UnauthorizedPage } from './features/auth/pages/UnauthorizedPage'
import { BudgetsLayout } from './features/budgets/BudgetsLayout'
import { BudgetFormPage } from './features/budgets/pages/BudgetFormPage'
import { BudgetsPage } from './features/budgets/pages/BudgetsPage'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ExpenseAddChoicePage } from './features/expenses/pages/ExpenseAddChoicePage'
import { ExpenseFormPage } from './features/expenses/pages/ExpenseFormPage'
import { ExpensesPage } from './features/expenses/pages/ExpensesPage'
import { HelpPage } from './features/guidance/pages/HelpPage'
import { IncomeAddChoicePage } from './features/income/pages/IncomeAddChoicePage'
import { IncomeFormPage } from './features/income/pages/IncomeFormPage'
import { IncomePage } from './features/income/pages/IncomePage'
import { RecurringFormPage } from './features/recurring/pages/RecurringFormPage'
import { RecurringPage } from './features/recurring/pages/RecurringPage'
import { RecurringIncomeFormPage } from './features/recurringIncome/pages/RecurringIncomeFormPage'
import { RecurringIncomePage } from './features/recurringIncome/pages/RecurringIncomePage'
import { ReportsLayout } from './features/reports/ReportsLayout'
import { ExportsPage } from './features/reports/pages/ExportsPage'
import { MonthlyReportPage } from './features/reports/pages/MonthlyReportPage'
import { TrendsPage } from './features/reports/pages/TrendsPage'
import { YtdPage } from './features/reports/pages/YtdPage'
import { SettingsLayout } from './features/settings/SettingsLayout'
import { SettingsAccountPage } from './features/settings/pages/SettingsAccountPage'
import { SettingsSecurityPage } from './features/settings/pages/SettingsSecurityPage'
import {
  ReportsCashFlowPage,
  SettingsAboutPage,
  SettingsPreferencesPage,
} from './features/settings/pages/placeholderPages'
import { TransactionsLayout } from './features/transactions/TransactionsLayout'
import { HomePage } from './pages/HomePage'
import { paths } from './routes/paths'

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

/** Preserves query string when redirecting legacy help URLs. */
function HelpRedirect() {
  const location = useLocation()
  return <Navigate to={`${paths.settingsHelp}${location.search}`} replace />
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route path="/help" element={<HelpRedirect />} />

          <Route
            path="/dashboard"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />

          <Route
            path="/transactions"
            element={
              <Protected>
                <TransactionsLayout />
              </Protected>
            }
          >
            <Route index element={<Navigate to={paths.transactionsExpenses} replace />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="expenses/add" element={<ExpenseAddChoicePage />} />
            <Route path="expenses/new" element={<ExpenseFormPage mode="create" />} />
            <Route path="expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
            <Route path="income" element={<IncomePage />} />
            <Route path="income/add" element={<IncomeAddChoicePage />} />
            <Route path="income/new" element={<IncomeFormPage mode="create" />} />
            <Route path="income/:id/edit" element={<IncomeFormPage mode="edit" />} />
            <Route path="recurring-expenses" element={<RecurringPage />} />
            <Route path="recurring-expenses/new" element={<RecurringFormPage mode="create" />} />
            <Route path="recurring-expenses/:id/edit" element={<RecurringFormPage mode="edit" />} />
            <Route path="recurring-income" element={<RecurringIncomePage />} />
            <Route path="recurring-income/new" element={<RecurringIncomeFormPage mode="create" />} />
            <Route
              path="recurring-income/:id/edit"
              element={<RecurringIncomeFormPage mode="edit" />}
            />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="categories/new" element={<CategoryFormPage mode="create" />} />
            <Route path="categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
          </Route>

          <Route
            path="/budgets"
            element={
              <Protected>
                <BudgetsLayout />
              </Protected>
            }
          >
            <Route index element={<Navigate to={paths.budgetsMonthly} replace />} />
            <Route path="monthly" element={<BudgetsPage view="monthly" />} />
            <Route path="categories" element={<BudgetsPage view="categories" />} />
          </Route>
          <Route
            path="/budgets/new"
            element={
              <Protected>
                <BudgetFormPage mode="create" />
              </Protected>
            }
          />
          <Route
            path="/budgets/:id/edit"
            element={
              <Protected>
                <BudgetFormPage mode="edit" />
              </Protected>
            }
          />

          <Route
            path="/reports"
            element={
              <Protected>
                <ReportsLayout />
              </Protected>
            }
          >
            <Route index element={<Navigate to={paths.reportsMonthly} replace />} />
            <Route path="monthly" element={<MonthlyReportPage />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="year-to-date" element={<YtdPage />} />
            <Route path="cash-flow" element={<ReportsCashFlowPage />} />
            <Route path="exports" element={<ExportsPage />} />
          </Route>

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to={paths.settingsHelp} replace />} />
            <Route
              path="account"
              element={
                <Protected>
                  <SettingsAccountPage />
                </Protected>
              }
            />
            <Route path="help" element={<HelpPage />} />
            <Route
              path="security"
              element={
                <Protected>
                  <SettingsSecurityPage />
                </Protected>
              }
            />
            <Route
              path="preferences"
              element={
                <Protected>
                  <SettingsPreferencesPage />
                </Protected>
              }
            />
            <Route
              path="about"
              element={
                <Protected>
                  <SettingsAboutPage />
                </Protected>
              }
            />
          </Route>

          {/* Legacy redirects — keep bookmarks working */}
          <Route path="/expenses" element={<Navigate to={paths.transactionsExpenses} replace />} />
          <Route
            path="/expenses/add"
            element={<Navigate to={paths.transactionsExpensesAdd} replace />}
          />
          <Route
            path="/expenses/new"
            element={<Navigate to={paths.transactionsExpensesNew} replace />}
          />
          <Route
            path="/expenses/:id/edit"
            element={<LegacyIdRedirect base={paths.transactionsExpenses} suffix="/edit" />}
          />
          <Route path="/income" element={<IncomeLegacyRedirect />} />
          <Route path="/income/add" element={<Navigate to={paths.transactionsIncomeAdd} replace />} />
          <Route path="/income/new" element={<Navigate to={paths.transactionsIncomeNew} replace />} />
          <Route
            path="/income/:id/edit"
            element={<LegacyIdRedirect base={paths.transactionsIncome} suffix="/edit" />}
          />
          <Route
            path="/recurring"
            element={<Navigate to={paths.transactionsRecurringExpenses} replace />}
          />
          <Route
            path="/recurring/new"
            element={<Navigate to={paths.transactionsRecurringExpenseNew} replace />}
          />
          <Route
            path="/recurring/:id/edit"
            element={<LegacyIdRedirect base={paths.transactionsRecurringExpenses} suffix="/edit" />}
          />
          <Route
            path="/recurring-income"
            element={<Navigate to={paths.transactionsRecurringIncome} replace />}
          />
          <Route
            path="/recurring-income/new"
            element={<Navigate to={paths.transactionsRecurringIncomeNew} replace />}
          />
          <Route
            path="/recurring-income/:id/edit"
            element={<LegacyIdRedirect base={paths.transactionsRecurringIncome} suffix="/edit" />}
          />
          <Route
            path="/categories"
            element={<Navigate to={paths.transactionsCategories} replace />}
          />
          <Route
            path="/categories/new"
            element={<Navigate to={paths.transactionsCategoryNew} replace />}
          />
          <Route
            path="/categories/:id/edit"
            element={<LegacyIdRedirect base={paths.transactionsCategories} suffix="/edit" />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

function LegacyIdRedirect({ base, suffix }: { base: string; suffix: string }) {
  const location = useLocation()
  const match = location.pathname.match(/\/(\d+)(?:\/|$)/)
  const id = match?.[1]
  if (!id) {
    return <Navigate to={base} replace />
  }
  return <Navigate to={`${base}/${id}${suffix}`} replace />
}

function IncomeLegacyRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  if (params.get('section') === 'recurring') {
    return <Navigate to={paths.transactionsRecurringIncome} replace state={location.state} />
  }
  return <Navigate to={paths.transactionsIncome} replace state={location.state} />
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
