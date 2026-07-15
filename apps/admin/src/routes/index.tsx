import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from '../auth/AdminLogin'
import AdminShell from '../components/AdminShell'
import ProtectedRoute from './ProtectedRoute'
import OverviewPage from '../pages/OverviewPage'
import UsersPage from '../pages/UsersPage'
import VerificationPage from '../pages/VerificationPage'
import EscrowPage from '../pages/EscrowPage'
import AdBoostPage from '../pages/AdBoostPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<OverviewPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/escrow" element={<EscrowPage />} />
          <Route path="/adboost" element={<AdBoostPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
