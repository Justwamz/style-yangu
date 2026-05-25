import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const Onboarding = lazy(() => import('../onboarding'))
const AppShell   = lazy(() => import('../AppShell'))
const HomeTab     = lazy(() => import('../pages/HomeTab'))
const WardrobeTab = lazy(() => import('../pages/WardrobeTab'))
const StyleTab    = lazy(() => import('../pages/StyleTab'))
const DiscoverTab = lazy(() => import('../pages/DiscoverTab'))
const ProfileTab  = lazy(() => import('../pages/ProfileTab'))

const loading = <div className="min-h-screen bg-[#FDFAF7]" />

function AuthGuard() {
  const token = localStorage.getItem('sy_token')
  return token ? <Navigate to="/home" replace /> : <Navigate to="/onboarding" replace />
}

const router = createBrowserRouter([
  { path: '/', element: <AuthGuard /> },
  {
    path: '/onboarding',
    element: <Suspense fallback={loading}><Onboarding /></Suspense>,
  },
  {
    path: '/home',
    element: <Suspense fallback={loading}><AppShell /></Suspense>,
    children: [
      { index: true, element: <Suspense fallback={loading}><HomeTab /></Suspense> },
      { path: 'wardrobe', element: <Suspense fallback={loading}><WardrobeTab /></Suspense> },
      { path: 'style',    element: <Suspense fallback={loading}><StyleTab /></Suspense> },
      { path: 'discover', element: <Suspense fallback={loading}><DiscoverTab /></Suspense> },
      { path: 'profile',  element: <Suspense fallback={loading}><ProfileTab /></Suspense> },
    ],
  },
])

export default router
