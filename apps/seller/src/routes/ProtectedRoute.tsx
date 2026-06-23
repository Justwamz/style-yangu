import { Navigate, Outlet } from 'react-router-dom'
import { useSellerContext } from '../context/SellerContext'

export default function ProtectedRoute() {
  const token = localStorage.getItem('sy_seller_token')
  const { profile, loading } = useSellerContext()

  if (!token) return <Navigate to="/auth" replace />
  if (loading) return null
  if (profile && !profile.onboardingDone) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
