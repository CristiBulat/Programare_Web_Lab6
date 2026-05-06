import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LibraryService } from '../../services/library.service';
import {
  MediaType,
  STATUS_LABEL,
  STATUS_ORDER,
  TYPE_LABEL,
  TYPES,
  WatchStatus,
} from '../../models/types';

@Component({
  selector: 'app-add-manual',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-2xl space-y-6">
      <header>
        <h1 class="text-3xl font-bold">Add manually</h1>
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          For titles you can't find via search.
        </p>
      </header>

      <form (ngSubmit)="handleSubmit()" class="card p-5 space-y-4">
        <div>
          <label class="text-xs font-medium uppercase tracking-wider">Title *</label>
          <input
            autoFocus
            required
            class="input mt-1"
            [(ngModel)]="title"
            name="title"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium uppercase tracking-wider">Type</label>
            <select class="input mt-1" [(ngModel)]="type" name="type">
              @for (t of types; track t) {
                <option [value]="t">{{ typeLabel(t) }}</option>
              }
            </select>
          </div>
          <div>
            <label class="text-xs font-medium uppercase tracking-wider">Status</label>
            <select class="input mt-1" [(ngModel)]="status" name="status">
              @for (s of statuses; track s) {
                <option [value]="s">{{ statusLabel(s) }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium uppercase tracking-wider">Year</label>
            <input class="input mt-1" inputmode="numeric" [(ngModel)]="year" name="year" placeholder="2024" />
          </div>
          <div>
            <label class="text-xs font-medium uppercase tracking-wider">
              {{ type === 'movie' ? '—' : 'Total episodes' }}
            </label>
            <input
              class="input mt-1"
              inputmode="numeric"
              [disabled]="type === 'movie'"
              [(ngModel)]="episodesTotal"
              name="episodesTotal"
            />
          </div>
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider">Poster URL</label>
          <input class="input mt-1" [(ngModel)]="poster" name="poster" placeholder="https://…" />
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider">Genres (comma-separated)</label>
          <input class="input mt-1" [(ngModel)]="genres" name="genres" placeholder="Action, Drama" />
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider">Synopsis</label>
          <textarea class="input mt-1 min-h-[80px]" [(ngModel)]="synopsis" name="synopsis"></textarea>
        </div>

        <div>
          <label class="text-xs font-medium uppercase tracking-wider">My notes</label>
          <textarea class="input mt-1 min-h-[80px]" [(ngModel)]="notes" name="notes"></textarea>
        </div>

        <div class="flex gap-2 justify-end">
          <button type="button" class="btn-outline" (click)="cancel()">Cancel</button>
          <button type="submit" class="btn-primary" [disabled]="submitting() || !title.trim()">
            Add to library
          </button>
        </div>
      </form>
    </div>
  `,
})
export class AddManualComponent {
  private library = inject(LibraryService);
  private router = inject(Router);

  types: MediaType[] = TYPES;
  statuses: WatchStatus[] = STATUS_ORDER;

  title = '';
  type: MediaType = 'movie';
  status: WatchStatus = 'plan_to_watch';
  year = '';
  poster = '';
  genres = '';
  synopsis = '';
  notes = '';
  episodesTotal = '';
  submitting = signal(false);

  typeLabel(t: MediaType) { return TYPE_LABEL[t]; }
  statusLabel(s: WatchStatus) { return STATUS_LABEL[s]; }

  async handleSubmit() {
    if (!this.title.trim()) return;
    this.submitting.set(true);
    const yearNum = this.year.trim() ? Number(this.year) : null;
    const epTotal = this.episodesTotal.trim() ? Number(this.episodesTotal) : null;
    const id = await this.library.addManual({
      title: this.title.trim(),
      type: this.type,
      status: this.status,
      year: Number.isFinite(yearNum as number) ? (yearNum as number) : null,
      posterUrl: this.poster.trim() || undefined,
      genres: this.genres.split(',').map((g) => g.trim()).filter(Boolean),
      synopsis: this.synopsis.trim() || undefined,
      notes: this.notes.trim() || undefined,
      episodesTotal: Number.isFinite(epTotal as number) ? (epTotal as number) : null,
    });
    this.router.navigate(['/entry', id]);
  }

  cancel() {
    this.router.navigate(['/']);
  }
}
