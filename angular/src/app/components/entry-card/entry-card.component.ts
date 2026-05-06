import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { PosterComponent } from '../poster/poster.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { LibraryService } from '../../services/library.service';
import { TYPE_LABEL, WatchEntry } from '../../models/types';

@Component({
  selector: 'app-entry-card',
  standalone: true,
  imports: [RouterLink, IconComponent, PosterComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [routerLink]="['/entry', entry.id]"
      class="card group overflow-hidden flex flex-col hover:border-accent/50 transition-colors"
    >
      <div class="relative aspect-[2/3] w-full overflow-hidden">
        <app-poster
          [src]="entry.posterUrl"
          [type]="entry.type"
          [alt]="entry.title"
          cssClass="w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <button
          type="button"
          (click)="onLikeClick($event)"
          [attr.aria-label]="entry.liked ? 'Unlike' : 'Like'"
          class="absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
          [class]="entry.liked ? 'bg-accent text-white' : 'bg-black/30 text-white hover:bg-black/50'"
        >
          <app-icon name="heart" [size]="16" [filled]="entry.liked" />
        </button>
        <div class="absolute bottom-2 left-2">
          <app-status-badge [status]="entry.status" />
        </div>
      </div>
      <div class="p-3 flex-1 flex flex-col">
        <div class="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-0.5">
          {{ typeLabel(entry.type) }}{{ entry.year ? ' · ' + entry.year : '' }}
        </div>
        <h3 class="font-semibold text-sm leading-snug line-clamp-2">{{ entry.title }}</h3>
        @if (entry.rating != null) {
          <div class="text-xs text-accent mt-1 font-medium">
            ★ {{ (entry.rating / 2).toFixed(1) }}/5
          </div>
        }
      </div>
    </a>
  `,
})
export class EntryCardComponent {
  @Input({ required: true }) entry!: WatchEntry;

  private library = inject(LibraryService);

  typeLabel(t: WatchEntry['type']) {
    return TYPE_LABEL[t];
  }

  onLikeClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (this.entry.id != null) this.library.toggleLiked(this.entry.id);
  }
}
