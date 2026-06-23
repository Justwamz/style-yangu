import { Routes, Route, Navigate } from 'react-router-dom'
import PhoneEntry from '../auth/PhoneEntry'
import OTPVerify from '../auth/OTPVerify'
import OnboardingWizard from '../onboarding/OnboardingWizard'
import AppShell from '../components/AppShell'
import ProtectedRoute from './ProtectedRoute'
import DashboardTab from '../pages/DashboardTab'
import InventoryTab from '../pages/InventoryTab'
import InventoryNewPage from '../pages/InventoryNewPage'
import POSTab from '../pages/POSTab'
import ClientsTab from '../pages/ClientsTab'
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
          <Route path="/inventory" element={<InventoryTab />} />
          <Route path="/inventory/new" element={<InventoryNewPage />} />
          <Route path="/pos" element={<POSTab />} />
          <Route path="/clients" element={<ClientsTab />} />
          <Route path="/profile" element={<ProfileTab />} />
        </Route>
      </Route>
    </Routes>
  )
}
