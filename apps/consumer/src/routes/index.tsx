import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Onboarding = lazy(() => import('../onboarding'))
const Home = lazy(() => import('../pages/Home'))

function AuthGuard() {
  const token = localStorage.getItem('sy_token')
  return token ? <Navigate to="/home" replace /> : <Navigate to="/onboarding" replace />
}

const router = createBrowserRouter([
  { path: '/', element: <AuthGuard /> },
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-[#FDFAF7]" />}>
        <Onboarding />
      </Suspense>
    ),
  },
  {
    path: '/home',
    element: (
      <Suspense fallback={<div className="min-h-screen bg-[#FDFAF7]" />}>
        <Home />
      </Suspense>
    ),
  },
])

export default router
