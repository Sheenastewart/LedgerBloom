import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { BudgetFormPage } from './features/budgets/pages/BudgetFormPage'
import { BudgetsPage } from './features/budgets/pages/BudgetsPage'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ExpenseFormPage } from './features/expenses/pages/ExpenseFormPage'
import { ExpensesPage } from './features/expenses/pages/ExpensesPage'
import { IncomeFormPage } from './features/income/pages/IncomeFormPage'
import { IncomePage } from './features/income/pages/IncomePage'
import { RecurringFormPage } from './features/recurring/pages/RecurringFormPage'
import { RecurringPage } from './features/recurring/pages/RecurringPage'
import { HomePage } from './pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/budgets/new" element={<BudgetFormPage mode="create" />} />
        <Route path="/budgets/:id/edit" element={<BudgetFormPage mode="edit" />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryFormPage mode="create" />} />
        <Route path="/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
        <Route path="/recurring" element={<RecurringPage />} />
        <Route path="/recurring/new" element={<RecurringFormPage mode="create" />} />
        <Route path="/recurring/:id/edit" element={<RecurringFormPage mode="edit" />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/income/new" element={<IncomeFormPage mode="create" />} />
        <Route path="/income/:id/edit" element={<IncomeFormPage mode="edit" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
