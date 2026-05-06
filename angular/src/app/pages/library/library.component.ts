import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LibraryService } from '../../services/library.service';
import { EntryCardComponent } from '../../components/entry-card/entry-card.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import { IconComponent } from '../../components/icon/icon.component';
import {
  MediaType,
  SortKey,
  STATUS_LABEL,
  STATUS_ORDER,
  TYPE_LABEL,
  TYPES,
  WatchStatus,
} from '../../models/types';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
];

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [FormsModule, RouterLink, EntryCardComponent, EmptyStateComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (library.loaded() && library.entries().length === 0) {
      <app-empty-state
        title="Your library is empty"
        description="Search for anime, movies and series to build your watchlist — or add an entry manually."
        [hasIcon]="true"
      >
        <app-icon icon name="library" [size]="48" />
        <div action class="flex gap-2 justify-center">
          <a routerLink="/search" class="btn-primary">
            <app-icon name="search" [size]="16" /> Search
          </a>
          <a routerLink="/add" class="btn-outline">
            <app-icon name="plus" [size]="16" /> Add manually
          </a>
        </div>
      </app-empty-state>
    } @else {
      <div class="space-y-6">
        <header class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 class="text-3xl font-bold">Library</h1>
            <p class="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
              {{ library.entries().length }}
              {{ library.entries().length === 1 ? 'entry' : 'entries' }} ·
              {{ library.stats().watching }} watching ·
              {{ library.stats().completed }} completed ·
              {{ library.stats().plan_to_watch }} planned
            </p>
          </div>
          <div class="flex gap-2">
            <a routerLink="/search" class="btn-outline">
              <app-icon name="search" [size]="16" /> Search
            </a>
            <a routerLink="/add" class="btn-primary">
              <app-icon name="plus" [size]="16" /> Add
            </a>
          </div>
        </header>

        <div class="flex flex-wrap gap-2">
          <div class="relative flex-1 min-w-[220px]">
            <app-icon
              name="search"
              [size]="16"
              cssClass="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted"
            />
            <input
              type="search"
              placeholder="Search your library…"
              [ngModel]="library.filters().query"
              (ngModelChange)="library.setFilters({ query: $event })"
              class="input pl-9"
            />
          </div>
          <select
            [ngModel]="library.filters().sort"
            (ngModelChange)="library.setFilters({ sort: $event })"
            class="input md:w-56"
          >
            @for (s of sorts; track s.value) {
              <option [value]="s.value">Sort: {{ s.label }}</option>
            }
          </select>
        </div>

        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Type</span>
            @for (t of types; track t) {
              <button
                type="button"
                (click)="library.toggleFilterValue('types', t)"
                class="chip"
                [class.chip-active]="library.filters().types.has(t)"
              >
                {{ typeLabel(t) }}
              </button>
            }
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Status</span>
            @for (s of statuses; track s) {
              <button
                type="button"
                (click)="library.toggleFilterValue('statuses', s)"
                class="chip"
                [class.chip-active]="library.filters().statuses.has(s)"
              >
                {{ statusLabel(s) }}
              </button>
            }
            <button
              type="button"
              (click)="library.setFilters({ likedOnly: !library.filters().likedOnly })"
              class="chip"
              [class.chip-active]="library.filters().likedOnly"
            >
              ♥ Liked only
            </button>
          </div>

          @if (library.allGenres().length > 0) {
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Genre</span>
              @for (g of library.allGenres(); track g) {
                <button
                  type="button"
                  (click)="library.toggleFilterValue('genres', g)"
                  class="chip"
                  [class.chip-active]="library.filters().genres.has(g)"
                >
                  {{ g }}
                </button>
              }
            </div>
          }

          @if (library.hasActiveFilters()) {
            <button
              type="button"
              (click)="library.resetFilters()"
              class="text-xs text-accent hover:underline"
            >
              Clear filters
            </button>
          }
        </div>

        @if (library.filtered().length === 0) {
          <app-empty-state
            title="No entries match"
            description="Try changing or clearing your filters."
          >
            <button action type="button" class="btn-outline" (click)="library.resetFilters()">
              Clear filters
            </button>
          </app-empty-state>
        } @else {
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            @for (e of library.filtered(); track e.id) {
              <app-entry-card [entry]="e" />
            }
          </div>
        }
      </div>
    }
  `,
})
export class LibraryComponent {
  library = inject(LibraryService);
  sorts = SORTS;
  types: MediaType[] = TYPES;
  statuses: WatchStatus[] = STATUS_ORDER;

  typeLabel(t: MediaType) {
    return TYPE_LABEL[t];
  }
  statusLabel(s: WatchStatus) {
    return STATUS_LABEL[s];
  }
}
