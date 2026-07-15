import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { DashboardPage } from './features/dashboard/pages/DashboardPage'
import { ExpenseFormPage } from './features/expenses/pages/ExpenseFormPage'
import { ExpensesPage } from './features/expenses/pages/ExpensesPage'
import { IncomeFormPage } from './features/income/pages/IncomeFormPage'
import { IncomePage } from './features/income/pages/IncomePage'
import { HomePage } from './pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryFormPage mode="create" />} />
        <Route path="/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
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
