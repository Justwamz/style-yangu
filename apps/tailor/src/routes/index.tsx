import { Routes, Route, Navigate } from 'react-router-dom'
import PhoneEntry from '../auth/PhoneEntry'
import OTPVerify from '../auth/OTPVerify'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import AppShell from '../components/AppShell'
import ProtectedRoute from './ProtectedRoute'
import DashboardTab from '../pages/DashboardTab'
import OrdersTab from '../pages/OrdersTab'
import OrderNewPage from '../pages/OrderNewPage'
import OrderDetailPage from '../pages/OrderDetailPage'
import AppointmentsTab from '../pages/AppointmentsTab'
import ProfileTab from '../pages/ProfileTab'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<PhoneEntry />} />
      <Route path="/auth/verify" element={<OTPVerify />} />
      <Route path="/onboarding" element={<OnboardingWizard />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/orders" element={<OrdersTab />} />
          <Route path="/orders/new" element={<OrderNewPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/appointments" element={<AppointmentsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Route>
      </Route>
    </Routes>
  )
}
