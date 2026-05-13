import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent, IconName } from '../icon/icon.component';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  exact?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent, ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex flex-col md:flex-row">
      <aside
        class="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r border-line dark:border-line-dark bg-surface/60 dark:bg-surface-dark/60 backdrop-blur sticky top-0 z-20"
      >
        <div class="px-5 py-4 flex md:flex-col gap-3 md:gap-2 items-center md:items-stretch">
          <div class="flex items-center gap-2 mr-auto md:mr-0 md:mb-3">
            <div
              class="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold"
            >
              R
            </div>
            <span class="font-display font-bold text-lg">Reel</span>
          </div>

          <nav class="flex md:flex-col gap-1 flex-1">
            @for (item of nav; track item.to) {
              <a
                [routerLink]="item.to"
                routerLinkActive="bg-accent/10 text-accent"
                [routerLinkActiveOptions]="{ exact: !!item.exact }"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-ink dark:text-ink-dark hover:bg-elevated dark:hover:bg-elevated-dark"
              >
                <span class="hidden md:inline-flex">
                  <app-icon [name]="item.icon" />
                </span>
                <span class="md:inline">{{ item.label }}</span>
              </a>
            }
          </nav>

          <div class="md:mt-auto space-y-2">
            <div class="hidden md:block text-xs">
              @if (auth.isAuthenticated()) {
                <a
                  routerLink="/login"
                  class="card px-3 py-2 flex flex-col gap-0.5 hover:border-accent/50 transition-colors"
                  title="Re-authenticate"
                >
                  <span class="flex items-center gap-1 font-semibold">
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    {{ auth.role() }}
                  </span>
                  <span class="text-ink-muted dark:text-ink-dark-muted">
                    Expires in {{ auth.secondsRemaining() }}s
                  </span>
                </a>
              } @else if (settings.apiMode()) {
                <a routerLink="/login" class="card px-3 py-2 block hover:border-accent/50 transition-colors">
                  <span class="flex items-center gap-1 font-semibold">
                    <span class="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                    Sign in
                  </span>
                  <span class="text-ink-muted dark:text-ink-dark-muted">API mode on</span>
                </a>
              } @else {
                <div class="card px-3 py-2">
                  <span class="flex items-center gap-1 text-ink-muted dark:text-ink-dark-muted">
                    <span class="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
                    Offline mode
                  </span>
                </div>
              }
            </div>
            <app-theme-toggle />
          </div>
        </div>
      </aside>

      <main class="flex-1 min-w-0">
        <div class="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class LayoutComponent {
  auth = inject(AuthService);
  settings = inject(SettingsService);

  nav: NavItem[] = [
    { to: '/', label: 'Library', icon: 'library', exact: true },
    { to: '/search', label: 'Search', icon: 'search' },
    { to: '/add', label: 'Add manually', icon: 'plus' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ];
}
