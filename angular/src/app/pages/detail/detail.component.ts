import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LibraryService } from '../../services/library.service';
import { PosterComponent } from '../../components/poster/poster.component';
import { StarRatingComponent } from '../../components/star-rating/star-rating.component';
import { IconComponent } from '../../components/icon/icon.component';
import { EmptyStateComponent } from '../../components/empty-state/empty-state.component';
import {
  STATUS_LABEL,
  STATUS_ORDER,
  TYPE_LABEL,
  WatchStatus,
} from '../../models/types';
import { Location } from '@angular/common';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PosterComponent,
    StarRatingComponent,
    IconComponent,
    EmptyStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entry(); as e) {
      <div class="space-y-6">
        <button type="button" (click)="back()" class="btn-ghost -ml-2">
          <app-icon name="arrow-left" [size]="16" /> Back
        </button>

        <div class="grid md:grid-cols-[260px_1fr] gap-6 md:gap-8">
          <div>
            <div
              class="aspect-[2/3] w-full max-w-[260px] mx-auto md:mx-0 overflow-hidden rounded-xl border border-line dark:border-line-dark"
            >
              <app-poster
                [src]="e.posterUrl"
                [type]="e.type"
                [alt]="e.title"
                cssClass="w-full h-full"
              />
            </div>
          </div>

          <div class="space-y-5">
            <div class="flex flex-wrap items-start gap-3 justify-between">
              <div class="min-w-0">
                <div class="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                  {{ typeLabel(e.type) }}{{ e.year ? ' · ' + e.year : '' }}
                </div>
                <h1 class="text-3xl font-bold leading-tight">{{ e.title }}</h1>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="onLike()"
                  class="btn"
                  [class]="e.liked ? 'bg-accent text-white hover:bg-accent-hover' : 'btn-outline'"
                  [attr.aria-label]="e.liked ? 'Unlike' : 'Like'"
                >
                  <app-icon name="heart" [size]="16" [filled]="e.liked" />
                  {{ e.liked ? 'Liked' : 'Like' }}
                </button>
                @if (!editing()) {
                  <button type="button" (click)="startEdit()" class="btn-outline">
                    <app-icon name="pencil" [size]="16" /> Edit
                  </button>
                } @else {
                  <button type="button" (click)="editing.set(false)" class="btn-outline">
                    <app-icon name="x" [size]="16" /> Cancel
                  </button>
                }
                <button
                  type="button"
                  (click)="onDelete()"
                  class="btn-outline text-danger hover:bg-danger/10"
                >
                  <app-icon name="trash" [size]="16" />
                </button>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Status</span>
              @for (s of statuses; track s) {
                <button
                  type="button"
                  (click)="onSetStatus(s)"
                  class="chip"
                  [class.chip-active]="e.status === s"
                >
                  {{ statusLabel(s) }}
                </button>
              }
            </div>

            <div class="flex items-center gap-3">
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Rating</span>
              <app-star-rating
                [value]="e.rating"
                (valueChange)="onSetRating($event)"
              />
            </div>

            @if (e.type === 'anime' || e.type === 'series') {
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Episodes</span>
                <div class="inline-flex items-center gap-2">
                  <button type="button" class="btn-outline h-8 w-8 p-0" (click)="onEpisodes(-1)">−</button>
                  <span class="font-medium tabular-nums">
                    {{ e.episodesWatched ?? 0 }}{{ e.episodesTotal ? ' / ' + e.episodesTotal : '' }}
                  </span>
                  <button type="button" class="btn-outline h-8 w-8 p-0" (click)="onEpisodes(1)">+</button>
                </div>
              </div>
            }

            @if (e.genres.length > 0) {
              <div class="flex flex-wrap items-center gap-2">
                @for (g of e.genres; track g) {
                  <span class="chip cursor-default">{{ g }}</span>
                }
              </div>
            }

            @if (e.synopsis && !editing()) {
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-2">Synopsis</h2>
                <p class="text-sm leading-relaxed whitespace-pre-line">{{ e.synopsis }}</p>
              </div>
            }

            @if (e.notes && !editing()) {
              <div>
                <h2 class="text-sm font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-2">My notes</h2>
                <p class="text-sm leading-relaxed whitespace-pre-line">{{ e.notes }}</p>
              </div>
            }

            @if (editing()) {
              <div class="card p-4 space-y-3">
                <div>
                  <label class="text-xs font-medium uppercase tracking-wider">Title</label>
                  <input class="input mt-1" [(ngModel)]="draftTitle" name="dt" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs font-medium uppercase tracking-wider">Year</label>
                    <input class="input mt-1" [(ngModel)]="draftYear" inputmode="numeric" name="dy" />
                  </div>
                  <div>
                    <label class="text-xs font-medium uppercase tracking-wider">
                      {{ e.type === 'movie' ? '—' : 'Total episodes' }}
                    </label>
                    <input
                      class="input mt-1"
                      [(ngModel)]="draftEpTotal"
                      inputmode="numeric"
                      [disabled]="e.type === 'movie'"
                      name="dep"
                    />
                  </div>
                </div>
                <div>
                  <label class="text-xs font-medium uppercase tracking-wider">Poster URL</label>
                  <input class="input mt-1" [(ngModel)]="draftPoster" name="dp" placeholder="https://…" />
                </div>
                <div>
                  <label class="text-xs font-medium uppercase tracking-wider">Genres (comma-separated)</label>
                  <input class="input mt-1" [(ngModel)]="draftGenres" name="dg" placeholder="Action, Drama" />
                </div>
                <div>
                  <label class="text-xs font-medium uppercase tracking-wider">Synopsis</label>
                  <textarea class="input mt-1 min-h-[80px]" [(ngModel)]="draftSynopsis" name="ds"></textarea>
                </div>
                <div>
                  <label class="text-xs font-medium uppercase tracking-wider">My notes</label>
                  <textarea class="input mt-1 min-h-[80px]" [(ngModel)]="draftNotes" name="dn"></textarea>
                </div>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="btn-outline" (click)="editing.set(false)">Cancel</button>
                  <button type="button" class="btn-primary" (click)="saveEdit()">
                    <app-icon name="check" [size]="16" /> Save
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <app-empty-state title="Entry not found" description="It may have been deleted.">
        <a action routerLink="/" class="btn-outline">Back to library</a>
      </app-empty-state>
    }
  `,
})
export class DetailComponent {
  private library = inject(LibraryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);

  statuses: WatchStatus[] = STATUS_ORDER;

  numId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : Number.NaN;
  });
  entry = computed(() => this.library.entries().find((e) => e.id === this.numId()));

  editing = signal(false);
  draftTitle = '';
  draftYear = '';
  draftPoster = '';
  draftSynopsis = '';
  draftGenres = '';
  draftNotes = '';
  draftEpTotal = '';

  typeLabel(t: 'anime' | 'movie' | 'series') { return TYPE_LABEL[t]; }
  statusLabel(s: WatchStatus) { return STATUS_LABEL[s]; }

  back() { this.location.back(); }

  startEdit() {
    const e = this.entry();
    if (!e) return;
    this.draftTitle = e.title;
    this.draftYear = e.year ? String(e.year) : '';
    this.draftPoster = e.posterUrl ?? '';
    this.draftSynopsis = e.synopsis ?? '';
    this.draftGenres = e.genres.join(', ');
    this.draftNotes = e.notes ?? '';
    this.draftEpTotal = e.episodesTotal != null ? String(e.episodesTotal) : '';
    this.editing.set(true);
  }

  async saveEdit() {
    const e = this.entry();
    if (!e || e.id == null) return;
    const yearNum = this.draftYear.trim() ? Number(this.draftYear) : null;
    const epTotal = this.draftEpTotal.trim() ? Number(this.draftEpTotal) : null;
    await this.library.update(e.id, {
      title: this.draftTitle.trim() || e.title,
      year: Number.isFinite(yearNum as number) ? (yearNum as number) : null,
      posterUrl: this.draftPoster.trim() || undefined,
      synopsis: this.draftSynopsis.trim() || undefined,
      genres: this.draftGenres.split(',').map((g) => g.trim()).filter(Boolean),
      notes: this.draftNotes.trim() || undefined,
      episodesTotal: Number.isFinite(epTotal as number) ? (epTotal as number) : null,
    });
    this.editing.set(false);
  }

  async onDelete() {
    const e = this.entry();
    if (!e || e.id == null) return;
    if (!confirm(`Remove "${e.title}" from your library?`)) return;
    await this.library.remove(e.id);
    this.router.navigate(['/']);
  }

  async onEpisodes(delta: number) {
    const e = this.entry();
    if (!e || e.id == null) return;
    const next = Math.max(0, (e.episodesWatched ?? 0) + delta);
    const cap = e.episodesTotal ?? Number.POSITIVE_INFINITY;
    await this.library.update(e.id, { episodesWatched: Math.min(next, cap) });
  }

  onLike() {
    const e = this.entry();
    if (e?.id != null) this.library.toggleLiked(e.id);
  }

  onSetStatus(s: WatchStatus) {
    const e = this.entry();
    if (e?.id != null) this.library.setStatus(e.id, s);
  }

  onSetRating(v: number | null) {
    const e = this.entry();
    if (e?.id != null) this.library.setRating(e.id, v);
  }
}
