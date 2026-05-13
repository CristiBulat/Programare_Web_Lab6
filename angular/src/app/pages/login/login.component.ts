import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, Role } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../components/icon/icon.component';

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'ADMIN', label: 'Admin', description: 'READ · WRITE · DELETE' },
  { value: 'WRITER', label: 'Writer', description: 'READ · WRITE' },
  { value: 'VISITOR', label: 'Visitor', description: 'READ only' },
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-xl mx-auto space-y-6">
      <header class="space-y-2 text-center">
        <h1 class="text-3xl font-bold">Sign in to Reel API</h1>
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted">
          Pick a role to request a JWT from the backend. Tokens expire after 5 minutes.
        </p>
      </header>

      @if (reason() === 'expired') {
        <div class="card p-4 text-sm border-amber-400/40">
          Your previous token expired. Sign in again to continue.
        </div>
      }

      <div class="card p-5 space-y-4">
        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider">API URL</label>
          <input class="input" [(ngModel)]="apiUrl" name="apiUrl" placeholder="http://127.0.0.1:8000" />
          <p class="text-xs text-ink-muted dark:text-ink-dark-muted">
            Backend base URL. Persisted in localStorage. Default points to the
            FastAPI dev server.
          </p>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-medium uppercase tracking-wider">Role</label>
          <div class="grid gap-2">
            @for (r of roles; track r.value) {
              <button
                type="button"
                class="card p-3 text-left flex items-center justify-between transition-colors"
                [class.border-accent]="selectedRole() === r.value"
                [class.ring-2]="selectedRole() === r.value"
                [class.ring-accent]="selectedRole() === r.value"
                (click)="selectedRole.set(r.value)"
              >
                <div>
                  <div class="font-semibold">{{ r.label }}</div>
                  <div class="text-xs text-ink-muted dark:text-ink-dark-muted">
                    {{ r.description }}
                  </div>
                </div>
                @if (selectedRole() === r.value) {
                  <app-icon name="check" [size]="18" cssClass="text-accent" />
                }
              </button>
            }
          </div>
        </div>

        @if (error(); as err) {
          <div class="card p-3 text-sm text-danger border-danger/40">{{ err }}</div>
        }

        <div class="flex flex-wrap gap-2 justify-between items-center">
          <a routerLink="/" class="btn-ghost">Cancel</a>
          <button
            type="button"
            class="btn-primary"
            [disabled]="submitting()"
            (click)="submit()"
          >
            @if (submitting()) {
              Requesting token…
            } @else {
              <app-icon name="check" [size]="16" /> Sign in
            }
          </button>
        </div>
      </div>

      @if (auth.isAuthenticated()) {
        <div class="card p-4 text-sm space-y-1">
          <div>
            Signed in as <strong>{{ auth.role() }}</strong>
            with permissions [{{ auth.permissions().join(', ') }}].
          </div>
          <div class="text-ink-muted dark:text-ink-dark-muted">
            Token expires in {{ auth.secondsRemaining() }}s.
          </div>
        </div>
      }
    </div>
  `,
})
export class LoginComponent {
  protected auth = inject(AuthService);
  protected settings = inject(SettingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  roles = ROLES;
  selectedRole = signal<Role>(this.auth.role() ?? 'ADMIN');
  submitting = signal(false);
  error = signal<string | null>(null);
  apiUrl = this.settings.apiUrl();
  reason = signal<string | null>(this.route.snapshot.queryParamMap.get('reason'));

  async submit() {
    this.settings.setApiUrl(this.apiUrl);
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.signIn(this.selectedRole());
      this.settings.setApiMode(true);
      this.router.navigate(['/']);
    } catch (e) {
      const err = e as HttpErrorResponse | Error;
      const msg =
        err instanceof HttpErrorResponse
          ? `${err.status} ${err.statusText}: ${err.error?.detail ?? err.message}`
          : err.message;
      this.error.set(`Sign-in failed: ${msg}`);
    } finally {
      this.submitting.set(false);
    }
  }
}
