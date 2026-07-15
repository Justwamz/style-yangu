import { Navigate, Outlet } from 'react-router-dom'
import { RESELLER_TOKEN_KEY } from '../api'

export default function ProtectedRoute() {
  const token = localStorage.getItem(RESELLER_TOKEN_KEY)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}
