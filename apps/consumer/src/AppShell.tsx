import { Outlet, NavLink } from 'react-router-dom'
import { ProfileProvider } from './context/ProfileContext'
import { SuggestionProvider } from './context/SuggestionContext'

const NAV_ITEMS = [
  { to: '/home',          label: 'Home',     icon: '🏠', end: true },
  { to: '/home/wardrobe', label: 'Wardrobe', icon: '👕', end: false },
  { to: '/home/style',    label: 'Style',    icon: '⭐', end: false },
  { to: '/home/discover', label: 'Discover', icon: '🧭', end: false },
  { to: '/home/profile',  label: 'Profile',  icon: '👤', end: false },
]

export default function AppShell() {
  return (
    <ProfileProvider>
      <SuggestionProvider>
        <div className="min-h-screen bg-[#FDFAF7] flex flex-col">
          <main className="flex-1 overflow-y-auto pb-20">
            <Outlet />
          </main>
          <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E8DDD5] flex z-50">
            {NAV_ITEMS.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
                    isActive ? 'text-[#8B4513]' : 'text-[#1A0A00]/40'
                  }`
                }
              >
                <span className="text-xl leading-none">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </SuggestionProvider>
    </ProfileProvider>
  )
}
