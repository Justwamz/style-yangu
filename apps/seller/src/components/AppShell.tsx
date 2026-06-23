import { Outlet, NavLink } from 'react-router-dom'
import { useTierGate } from '../hooks/useTierGate'

const ACTIVE = '#8B4513'
const INACTIVE = 'rgba(26,10,0,0.4)'

const navStyle = ({ isActive }: { isActive: boolean }) => ({
  color: isActive ? ACTIVE : INACTIVE,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  fontSize: '0.65rem',
  fontWeight: isActive ? 600 : 400,
  textDecoration: 'none',
  gap: '2px',
})

export default function AppShell() {
  const { allowed: clientsAllowed } = useTierGate('clients_tab')

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 overflow-y-auto pb-16">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
        <NavLink to="/dashboard" style={navStyle}>
          <span>🏠</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/inventory" style={navStyle}>
          <span>👗</span>
          <span>Inventory</span>
        </NavLink>
        <NavLink to="/pos" style={navStyle}>
          <span>💳</span>
          <span>POS</span>
        </NavLink>
        {clientsAllowed && (
          <NavLink to="/clients" style={navStyle}>
            <span>👥</span>
            <span>Clients</span>
          </NavLink>
        )}
        <NavLink to="/profile" style={navStyle}>
          <span>👤</span>
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  )
}
