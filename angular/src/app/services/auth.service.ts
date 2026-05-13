import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';

export type Role = 'ADMIN' | 'WRITER' | 'VISITOR';
export type Permission = 'READ' | 'WRITE' | 'DELETE';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: Role;
  permissions: Permission[];
}

interface StoredAuth {
  token: string;
  role: Role;
  permissions: Permission[];
  expiresAt: number;
}

const STORAGE_KEY = 'reel.auth';

function readStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private settings = inject(SettingsService);

  private readonly state = signal<StoredAuth | null>(readStored());
  private readonly now = signal(Date.now());

  constructor() {
    setInterval(() => this.now.set(Date.now()), 1000);
  }

  readonly token = computed(() => {
    const s = this.state();
    if (!s) return null;
    return s.expiresAt > this.now() ? s.token : null;
  });
  readonly role = computed(() => this.state()?.role ?? null);
  readonly permissions = computed<Permission[]>(() => this.state()?.permissions ?? []);
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly secondsRemaining = computed(() => {
    const s = this.state();
    if (!s) return 0;
    return Math.max(0, Math.floor((s.expiresAt - this.now()) / 1000));
  });

  hasPermission(p: Permission): boolean {
    return this.permissions().includes(p);
  }

  async signIn(role: Role): Promise<void> {
    const url = `${this.settings.apiUrl()}/token`;
    const res = await firstValueFrom(
      this.http.post<TokenResponse>(url, { role }),
    );
    const stored: StoredAuth = {
      token: res.access_token,
      role: res.role,
      permissions: res.permissions,
      expiresAt: Date.now() + res.expires_in * 1000,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    this.state.set(stored);
    this.now.set(Date.now());
  }

  signOut(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state.set(null);
  }
}
