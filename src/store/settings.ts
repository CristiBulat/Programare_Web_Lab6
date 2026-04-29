import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'reel.theme'
const OMDB_KEY = 'reel.omdbKey'

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

interface SettingsState {
  theme: Theme
  omdbKey: string
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  setOmdbKey: (k: string) => void
}

export const useSettings = create<SettingsState>((set, get) => ({
  theme: readTheme(),
  omdbKey: localStorage.getItem(OMDB_KEY) ?? '',
  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme() {
    get().setTheme(get().theme === 'dark' ? 'light' : 'dark')
  },
  setOmdbKey(k) {
    localStorage.setItem(OMDB_KEY, k)
    set({ omdbKey: k })
  },
}))

// Apply on load.
applyTheme(useSettings.getState().theme)
