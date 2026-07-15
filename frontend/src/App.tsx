import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { CategoriesPage } from './features/categories/pages/CategoriesPage'
import { CategoryFormPage } from './features/categories/pages/CategoryFormPage'
import { HomePage } from './pages/HomePage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/new" element={<CategoryFormPage mode="create" />} />
        <Route path="/categories/:id/edit" element={<CategoryFormPage mode="edit" />} />
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
