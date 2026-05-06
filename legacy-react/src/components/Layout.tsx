import { NavLink, Outlet } from 'react-router-dom'
import { LibraryIcon, PlusIcon, SearchIcon, SettingsIcon } from './Icons'
import { ThemeToggle } from './ThemeToggle'
import type { ReactNode } from 'react'

const NAV: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/', label: 'Library', icon: <LibraryIcon />, end: true },
  { to: '/search', label: 'Search', icon: <SearchIcon /> },
  { to: '/add', label: 'Add manually', icon: <PlusIcon /> },
  { to: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) / topbar (mobile) */}
      <aside className="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r border-line dark:border-line-dark bg-surface/60 dark:bg-surface-dark/60 backdrop-blur sticky top-0 z-20">
        <div className="px-5 py-4 flex md:flex-col gap-3 md:gap-2 items-center md:items-stretch">
          <div className="flex items-center gap-2 mr-auto md:mr-0 md:mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold">
              R
            </div>
            <span className="font-display font-bold text-lg">Reel</span>
          </div>
          <nav className="flex md:flex-col gap-1 flex-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-ink dark:text-ink-dark hover:bg-elevated dark:hover:bg-elevated-dark'
                  }`
                }
              >
                <span className="hidden md:inline-flex">{item.icon}</span>
                <span className="md:inline">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="md:mt-auto">
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
