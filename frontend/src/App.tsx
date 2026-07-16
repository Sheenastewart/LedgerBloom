import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/components/ProtectedRoute'
import { ForbiddenPage } from './features/auth/pages/ForbiddenPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { UnauthorizedPage } from './features/auth/pages/UnauthorizedPage'
import { BudgetFormPage } from './features/budgets/pages/BudgetFormPage'
import { BudgetsPage } from './features/budgets/pages/BudgetsPage'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ExpenseFormPage } from './features/expenses/pages/ExpenseFormPage'
import { ExpensesPage } from './features/expenses/pages/ExpensesPage'
import { IncomeFormPage } from './features/income/pages/IncomeFormPage'
import { IncomeAddChoicePage } from './features/income/pages/IncomeAddChoicePage'
import { IncomePage } from './features/income/pages/IncomePage'
import { RecurringFormPage } from './features/recurring/pages/RecurringFormPage'
import { RecurringPage } from './features/recurring/pages/RecurringPage'
import { RecurringIncomeFormPage } from './features/recurringIncome/pages/RecurringIncomeFormPage'
import { RecurringIncomePage } from './features/recurringIncome/pages/RecurringIncomePage'
import { HelpPage } from './features/guidance/pages/HelpPage'
import { MonthlyReportPage } from './features/reports/pages/MonthlyReportPage'
import { ReportsPage } from './features/reports/pages/ReportsPage'
import { TrendsPage } from './features/reports/pages/TrendsPage'
import { YtdPage } from './features/reports/pages/YtdPage'
import { HomePage } from './pages/HomePage'

export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets"
            element={
              <ProtectedRoute>
                <BudgetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets/new"
            element={
              <ProtectedRoute>
                <BudgetFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/budgets/:id/edit"
            element={
              <ProtectedRoute>
                <BudgetFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories/new"
            element={
              <ProtectedRoute>
                <CategoryFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories/:id/edit"
            element={
              <ProtectedRoute>
                <CategoryFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/new"
            element={
              <ProtectedRoute>
                <ExpenseFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses/:id/edit"
            element={
              <ProtectedRoute>
                <ExpenseFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring"
            element={
              <ProtectedRoute>
                <RecurringPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring/new"
            element={
              <ProtectedRoute>
                <RecurringFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring/:id/edit"
            element={
              <ProtectedRoute>
                <RecurringFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring-income"
            element={
              <ProtectedRoute>
                <RecurringIncomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring-income/new"
            element={
              <ProtectedRoute>
                <RecurringIncomeFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recurring-income/:id/edit"
            element={
              <ProtectedRoute>
                <RecurringIncomeFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income"
            element={
              <ProtectedRoute>
                <IncomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income/add"
            element={
              <ProtectedRoute>
                <IncomeAddChoicePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income/new"
            element={
              <ProtectedRoute>
                <IncomeFormPage mode="create" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income/:id/edit"
            element={
              <ProtectedRoute>
                <IncomeFormPage mode="edit" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/trends"
            element={
              <ProtectedRoute>
                <TrendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/year-to-date"
            element={
              <ProtectedRoute>
                <YtdPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/monthly"
            element={
              <ProtectedRoute>
                <MonthlyReportPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
