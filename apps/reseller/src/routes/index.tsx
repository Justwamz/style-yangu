import { Routes, Route, Navigate } from 'react-router-dom'
import ResellerLogin from '../auth/ResellerLogin'
import ResellerShell from '../components/ResellerShell'
import ProtectedRoute from './ProtectedRoute'
import DashboardPage from '../pages/DashboardPage'
import EarningsPage from '../pages/EarningsPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<ResellerLogin />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ResellerShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
