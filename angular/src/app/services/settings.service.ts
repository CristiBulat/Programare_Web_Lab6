import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'reel.theme';
const OMDB_KEY = 'reel.omdbKey';
const DEFAULT_OMDB_KEY = '234d4886';

function readTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly theme = signal<Theme>(readTheme());
  readonly omdbKey = signal<string>(localStorage.getItem(OMDB_KEY) ?? DEFAULT_OMDB_KEY);

  constructor() {
    applyTheme(this.theme());
  }

  setTheme(theme: Theme) {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    this.theme.set(theme);
  }

  toggleTheme() {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setOmdbKey(key: string) {
    localStorage.setItem(OMDB_KEY, key);
    this.omdbKey.set(key);
  }
}
