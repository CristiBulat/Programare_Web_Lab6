import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { STATUS_LABEL, WatchStatus } from '../../models/types';

const STYLE: Record<WatchStatus, string> = {
  watching: 'bg-accent/10 text-accent ring-1 ring-accent/30',
  completed: 'bg-success/10 text-success ring-1 ring-success/30',
  plan_to_watch:
    'bg-elevated dark:bg-elevated-dark text-ink dark:text-ink-dark ring-1 ring-line dark:ring-line-dark',
  on_hold: 'bg-warning/10 text-warning ring-1 ring-warning/30',
  dropped: 'bg-danger/10 text-danger ring-1 ring-danger/30',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      [class]="cls()"
    >
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  private _status = signal<WatchStatus>('plan_to_watch');
  @Input({ required: true }) set status(v: WatchStatus) {
    this._status.set(v);
  }

  cls = computed(() => STYLE[this._status()]);
  label = computed(() => STATUS_LABEL[this._status()]);
}
