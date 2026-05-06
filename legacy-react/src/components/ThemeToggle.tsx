import { useSettings } from '../store/settings'
import { MoonIcon, SunIcon } from './Icons'

export function ThemeToggle() {
  const theme = useSettings((s) => s.theme)
  const toggle = useSettings((s) => s.toggleTheme)
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost h-9 w-9 p-0"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
