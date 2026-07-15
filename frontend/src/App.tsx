import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { ExpenseFormPage } from './features/expenses/pages/ExpenseFormPage'
import { ExpensesPage } from './features/expenses/pages/ExpensesPage'
import { HomePage } from './pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryFormPage mode="create" />} />
        <Route path="/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage mode="create" />} />
        <Route path="/expenses/:id/edit" element={<ExpenseFormPage mode="edit" />} />
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
