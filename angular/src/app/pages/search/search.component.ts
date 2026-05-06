import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, switchMap, of, debounceTime, distinctUntilChanged, catchError } from 'rxjs';
import { JikanService } from '../../services/jikan.service';
import { OmdbService } from '../../services/omdb.service';
import { LibraryService } from '../../services/library.service';
import { SettingsService } from '../../services/settings.service';
import { IconComponent } from '../../components/icon/icon.component';
import { PosterComponent } from '../../components/poster/poster.component';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MediaType, SearchResult, TYPE_LABEL } from '../../models/types';

interface Tab { type: MediaType; label: string }
const TABS: Tab[] = [
  { type: 'anime', label: 'Anime' },
  { type: 'movie', label: 'Movies' },
  { type: 'series', label: 'Series' },
];

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, IconComponent, PosterComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <header>
        <h1 class="text-3xl font-bold">Search</h1>
        <p class="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          Find titles via Jikan (anime) and OMDb (movies/series).
        </p>
      </header>

      <div class="flex gap-1 p-1 bg-elevated dark:bg-elevated-dark rounded-lg w-fit">
        @for (t of tabs; track t.type) {
          <button
            type="button"
            (click)="setTab(t.type)"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            [class]="tab() === t.type
              ? 'bg-surface dark:bg-surface-dark shadow-sm'
              : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'"
          >
            {{ t.label }}
          </button>
        }
      </div>

      <div class="relative">
        <app-icon
          name="search"
          [size]="18"
          cssClass="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted"
        />
        <input
          type="search"
          autoFocus
          [ngModel]="query()"
          (ngModelChange)="onQuery($event)"
          [placeholder]="placeholder()"
          class="input pl-10"
        />
        @if (loading()) {
          <span class="absolute right-3 top-1/2 -translate-y-1/2">
            <app-spinner [size]="16" />
          </span>
        }
      </div>

      @if (tab() !== 'anime' && !settings.omdbKey()) {
        <div class="card p-4 text-sm">
          <strong>OMDb key required</strong> to search movies/series.
          <a class="text-accent hover:underline" href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer">
            Get a free key
          </a>
          and paste it in <a class="text-accent hover:underline" href="#/settings">Settings</a>.
        </div>
      }

      @if (error(); as err) {
        <div class="card p-4 text-sm text-danger border-danger/40">{{ err }}</div>
      }

      @if (!loading() && results().length === 0 && query().trim() !== '' && !error()) {
        <div class="text-sm text-ink-muted dark:text-ink-dark-muted">No results.</div>
      }

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        @for (r of results(); track r.externalId) {
          <div class="card overflow-hidden flex flex-col">
            <div class="aspect-[2/3] w-full">
              <app-poster [src]="r.posterUrl" [type]="r.type" [alt]="r.title" cssClass="w-full h-full" />
            </div>
            <div class="p-3 flex-1 flex flex-col">
              <div class="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-0.5">
                {{ typeLabel(r.type) }}{{ r.year ? ' · ' + r.year : '' }}
              </div>
              <h3 class="font-semibold text-sm leading-snug line-clamp-2 mb-3">{{ r.title }}</h3>
              <button
                type="button"
                [disabled]="isSaved(r)"
                (click)="onAdd(r)"
                class="mt-auto btn"
                [class]="isSaved(r) ? 'btn-outline opacity-60 cursor-default' : 'btn-primary'"
              >
                @if (isSaved(r)) {
                  <app-icon name="check" [size]="14" /> In library
                } @else {
                  <app-icon name="plus" [size]="14" /> Add
                }
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class SearchComponent {
  private jikan = inject(JikanService);
  private omdb = inject(OmdbService);
  library = inject(LibraryService);
  settings = inject(SettingsService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  tabs = TABS;
  tab = signal<MediaType>('anime');
  query = signal('');
  results = signal<SearchResult[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private trigger$ = new Subject<{ q: string; tab: MediaType; key: string }>();

  savedExternalIds = computed(
    () => new Set(this.library.entries().map((e) => e.externalId).filter((x): x is string => !!x)),
  );

  placeholder = computed(() => {
    const t = TABS.find((tt) => tt.type === this.tab());
    return `Search ${t?.label.toLowerCase() ?? ''}…`;
  });

  constructor() {
    this.trigger$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(
          (a, b) => a.q === b.q && a.tab === b.tab && a.key === b.key,
        ),
        switchMap(({ q, tab, key }) => {
          if (!q.trim()) {
            this.loading.set(false);
            this.error.set(null);
            return of<SearchResult[]>([]);
          }
          this.loading.set(true);
          this.error.set(null);
          const obs =
            tab === 'anime'
              ? this.jikan.searchAnime(q)
              : this.omdb.search(q, key, tab);
          return obs.pipe(
            catchError((err: Error) => {
              this.error.set(err.message);
              return of<SearchResult[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        this.results.set(data);
        this.loading.set(false);
      });
  }

  setTab(t: MediaType) {
    this.tab.set(t);
    this.trigger$.next({ q: this.query(), tab: t, key: this.settings.omdbKey() });
  }

  onQuery(q: string) {
    this.query.set(q);
    this.trigger$.next({ q, tab: this.tab(), key: this.settings.omdbKey() });
  }

  isSaved(r: SearchResult) {
    return r.externalId ? this.savedExternalIds().has(r.externalId) : false;
  }

  async onAdd(r: SearchResult) {
    const id = await this.library.addFromSearch(r);
    this.router.navigate(['/entry', id]);
  }

  typeLabel(t: MediaType) {
    return TYPE_LABEL[t];
  }
}
