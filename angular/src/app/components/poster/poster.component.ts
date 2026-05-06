import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { MediaType } from '../../models/types';

@Component({
  selector: 'app-poster',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!src || errored()) {
      <div
        class="flex items-center justify-center bg-elevated dark:bg-elevated-dark text-ink-muted dark:text-ink-dark-muted"
        [class]="cssClass"
        role="img"
        [attr.aria-label]="alt"
      >
        @if (type === 'anime') {
          <app-icon name="sparkles" [size]="32" />
        } @else if (type === 'movie') {
          <app-icon name="film" [size]="32" />
        } @else {
          <app-icon name="tv" [size]="32" />
        }
      </div>
    } @else {
      <img
        [src]="src"
        [alt]="alt"
        loading="lazy"
        (error)="errored.set(true)"
        class="object-cover bg-elevated dark:bg-elevated-dark"
        [class]="cssClass"
      />
    }
  `,
})
export class PosterComponent {
  @Input() src?: string;
  @Input({ required: true }) type!: MediaType;
  @Input({ required: true }) alt!: string;
  @Input() cssClass = '';

  errored = signal(false);
}
