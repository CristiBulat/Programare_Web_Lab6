import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      (click)="settings.toggleTheme()"
      class="btn-ghost h-9 w-9 p-0"
      [attr.aria-label]="settings.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      [title]="settings.theme() === 'dark' ? 'Light mode' : 'Dark mode'"
    >
      @if (settings.theme() === 'dark') {
        <app-icon name="sun" />
      } @else {
        <app-icon name="moon" />
      }
    </button>
  `,
})
export class ThemeToggleComponent {
  settings = inject(SettingsService);
}
