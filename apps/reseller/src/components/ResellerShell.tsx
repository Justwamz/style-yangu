import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { RESELLER_TOKEN_KEY } from '../api'

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontSize: '0.85rem',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? '#D4A853' : 'rgba(255,255,255,0.6)',
  textDecoration: 'none',
})

export default function ResellerShell() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem(RESELLER_TOKEN_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="bg-dark px-5 md:px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <span className="font-display text-xl text-white tracking-wide">
          Style<span className="text-gold">Yangu</span>
          <span className="text-white/40 text-xs font-body ml-2">Resellers</span>
        </span>
        <nav className="flex items-center gap-6">
          <NavLink to="/dashboard" style={linkStyle}>Dashboard</NavLink>
          <NavLink to="/earnings" style={linkStyle}>Earnings</NavLink>
          <button onClick={logout} className="text-sm text-white/40 hover:text-white/70 transition-colors">Sign out</button>
        </nav>
      </header>
      <main className="bg-cream min-h-[calc(100vh-52px)]">
        <Outlet />
      </main>
    </div>
  )
}
