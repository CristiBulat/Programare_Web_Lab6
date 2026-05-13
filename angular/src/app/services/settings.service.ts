import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'reel.theme';
const OMDB_KEY = 'reel.omdbKey';
const API_URL_KEY = 'reel.apiUrl';
const API_MODE_KEY = 'reel.apiMode';
const DEFAULT_OMDB_KEY = '234d4886';
const DEFAULT_API_URL = 'http://127.0.0.1:8000';

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
  readonly apiUrl = signal<string>(localStorage.getItem(API_URL_KEY) ?? DEFAULT_API_URL);
  readonly apiMode = signal<boolean>(localStorage.getItem(API_MODE_KEY) === '1');

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

  setApiUrl(url: string) {
    const cleaned = url.trim().replace(/\/+$/, '') || DEFAULT_API_URL;
    localStorage.setItem(API_URL_KEY, cleaned);
    this.apiUrl.set(cleaned);
  }

  setApiMode(enabled: boolean) {
    localStorage.setItem(API_MODE_KEY, enabled ? '1' : '0');
    this.apiMode.set(enabled);
  }
}
