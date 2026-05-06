import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center text-center py-16 px-6">
      @if (hasIcon) {
        <div class="mb-4 text-ink-muted dark:text-ink-dark-muted">
          <ng-content select="[icon]" />
        </div>
      }
      <h3 class="text-lg font-semibold mb-1">{{ title }}</h3>
      @if (description) {
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted max-w-md">{{ description }}</p>
      }
      <div class="mt-5">
        <ng-content select="[action]" />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() hasIcon = false;
}
