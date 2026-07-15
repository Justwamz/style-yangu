import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ADMIN_TOKEN_KEY } from '../api'

const NAV = [
  { to: '/dashboard',    label: 'Overview',     icon: '📊' },
  { to: '/users',        label: 'Users',        icon: '👥' },
  { to: '/verification', label: 'Verification', icon: '✓' },
  { to: '/escrow',       label: 'Escrow',       icon: '💰' },
  { to: '/adboost',      label: 'Ad Boost',     icon: '📣' },
]

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  padding: '0.6rem 0.9rem',
  borderRadius: '0.5rem',
  fontSize: '0.85rem',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? '#1A0F0A' : 'rgba(255,255,255,0.6)',
  backgroundColor: isActive ? '#D4A853' : 'transparent',
  textDecoration: 'none',
})

export default function AdminShell() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-dark flex flex-col p-4 gap-1">
        <div className="px-2 py-3 mb-2">
          <span className="font-display text-xl text-white tracking-wide">
            Style<span className="text-gold">Yangu</span>
          </span>
          <p className="text-gold/70 text-[9px] font-semibold tracking-[0.25em] uppercase mt-0.5">Admin</p>
        </div>
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} style={linkStyle}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button
          onClick={logout}
          className="mt-auto text-left px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          Sign out
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-cream">
        <Outlet />
      </main>
    </div>
  )
}
