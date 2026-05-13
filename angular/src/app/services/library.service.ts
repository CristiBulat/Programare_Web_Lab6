import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { DbService } from './db.service';
import { SettingsService } from './settings.service';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import {
  MediaType,
  SearchResult,
  SortKey,
  WatchEntry,
  WatchStatus,
} from '../models/types';

interface Filters {
  query: string;
  types: Set<MediaType>;
  statuses: Set<WatchStatus>;
  genres: Set<string>;
  likedOnly: boolean;
  sort: SortKey;
}

const defaultFilters = (): Filters => ({
  query: '',
  types: new Set(),
  statuses: new Set(),
  genres: new Set(),
  likedOnly: false,
  sort: 'updated',
});

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private dbService = inject(DbService);
  private settings = inject(SettingsService);
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private get db() {
    return this.dbService.db;
  }

  readonly entries = signal<WatchEntry[]>([]);
  readonly loaded = signal(false);
  readonly filters = signal<Filters>(defaultFilters());

  readonly source = computed<'api' | 'local'>(() =>
    this.settings.apiMode() && this.auth.isAuthenticated() ? 'api' : 'local',
  );

  constructor() {
    effect(() => {
      this.source();
      this.loaded.set(false);
      this.entries.set([]);
      void this.load();
    });
  }

  readonly filtered = computed<WatchEntry[]>(() => {
    const entries = this.entries();
    const f = this.filters();
    const q = f.query.trim().toLowerCase();
    let out = entries.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q)) return false;
      if (f.types.size && !f.types.has(e.type)) return false;
      if (f.statuses.size && !f.statuses.has(e.status)) return false;
      if (f.likedOnly && !e.liked) return false;
      if (f.genres.size) {
        const hit = e.genres.some((g) => f.genres.has(g));
        if (!hit) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      switch (f.sort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          return (b.rating ?? -1) - (a.rating ?? -1);
        case 'year':
          return (b.year ?? 0) - (a.year ?? 0);
        case 'updated':
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
    return out;
  });

  readonly allGenres = computed<string[]>(() => {
    const set = new Set<string>();
    for (const e of this.entries()) for (const g of e.genres) set.add(g);
    return [...set].sort();
  });

  readonly stats = computed<Record<WatchStatus, number>>(() => {
    const byStatus: Record<WatchStatus, number> = {
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const e of this.entries()) byStatus[e.status]++;
    return byStatus;
  });

  async load() {
    if (this.source() === 'api') {
      try {
        const page = await this.api.listEntries({ skip: 0, limit: 200, sort: 'updated' });
        this.entries.set(page.items.map(normalizeEntry));
      } catch {
        this.entries.set([]);
      }
    } else {
      const entries = await this.db.entries.orderBy('updatedAt').reverse().toArray();
      this.entries.set(entries);
    }
    this.loaded.set(true);
  }

  async addManual(
    input: Omit<
      WatchEntry,
      'id' | 'createdAt' | 'updatedAt' | 'genres' | 'liked' | 'episodesWatched'
    > & {
      genres?: string[];
      liked?: boolean;
      episodesWatched?: number;
    },
  ): Promise<number> {
    const now = Date.now();
    const entryBase: WatchEntry = {
      title: input.title,
      type: input.type,
      year: input.year ?? null,
      posterUrl: input.posterUrl,
      synopsis: input.synopsis,
      genres: input.genres ?? [],
      rating: input.rating ?? null,
      liked: input.liked ?? false,
      status: input.status,
      notes: input.notes,
      episodesTotal: input.episodesTotal ?? null,
      episodesWatched: input.episodesWatched ?? 0,
      externalId: input.externalId,
      createdAt: now,
      updatedAt: now,
    };
    if (this.source() === 'api') {
      const created = normalizeEntry(await this.api.createEntry(entryBase));
      this.entries.update((arr) => [created, ...arr]);
      return created.id!;
    }
    const id = await this.db.entries.add(entryBase);
    this.entries.update((arr) => [{ ...entryBase, id }, ...arr]);
    return id;
  }

  async addFromSearch(result: SearchResult, status: WatchStatus = 'plan_to_watch'): Promise<number> {
    if (this.source() === 'api') {
      const existing = this.entries().find(
        (e) => result.externalId && e.externalId === result.externalId,
      );
      if (existing?.id != null) return existing.id;
      const created = normalizeEntry(
        await this.api.createEntry({
          externalId: result.externalId,
          type: result.type,
          title: result.title,
          year: result.year ?? null,
          posterUrl: result.posterUrl,
          synopsis: result.synopsis,
          genres: result.genres ?? [],
          rating: null,
          liked: false,
          status,
          episodesTotal: null,
          episodesWatched: 0,
        }),
      );
      this.entries.update((arr) => [created, ...arr]);
      return created.id!;
    }
    if (result.externalId) {
      const existing = await this.db.entries
        .where('externalId')
        .equals(result.externalId)
        .first();
      if (existing && existing.id != null) return existing.id;
    }
    const now = Date.now();
    const entry: WatchEntry = {
      externalId: result.externalId,
      type: result.type,
      title: result.title,
      year: result.year ?? null,
      posterUrl: result.posterUrl,
      synopsis: result.synopsis,
      genres: result.genres ?? [],
      rating: null,
      liked: false,
      status,
      episodesTotal: null,
      episodesWatched: 0,
      createdAt: now,
      updatedAt: now,
    };
    const id = await this.db.entries.add(entry);
    this.entries.update((arr) => [{ ...entry, id }, ...arr]);
    return id;
  }

  async update(id: number, patch: Partial<WatchEntry>) {
    const updatedAt = Date.now();
    if (this.source() === 'api') {
      const updated = normalizeEntry(await this.api.updateEntry(id, patch));
      this.entries.update((arr) => arr.map((e) => (e.id === id ? updated : e)));
      return;
    }
    await this.db.entries.update(id, { ...patch, updatedAt });
    this.entries.update((arr) =>
      arr.map((e) => (e.id === id ? { ...e, ...patch, updatedAt } : e)),
    );
  }

  async remove(id: number) {
    if (this.source() === 'api') {
      await this.api.deleteEntry(id);
    } else {
      await this.db.entries.delete(id);
    }
    this.entries.update((arr) => arr.filter((e) => e.id !== id));
  }

  async toggleLiked(id: number) {
    const e = this.entries().find((x) => x.id === id);
    if (!e) return;
    await this.update(id, { liked: !e.liked });
  }

  async setStatus(id: number, status: WatchStatus) {
    await this.update(id, { status });
  }

  async setRating(id: number, rating: number | null) {
    await this.update(id, { rating });
  }

  async importMany(entries: WatchEntry[]) {
    const cleaned = entries.map((e) => {
      const copy: WatchEntry = { ...e };
      delete copy.id;
      const now = Date.now();
      copy.createdAt = copy.createdAt ?? now;
      copy.updatedAt = copy.updatedAt ?? now;
      copy.episodesWatched = copy.episodesWatched ?? 0;
      copy.genres = copy.genres ?? [];
      return copy;
    });
    if (this.source() === 'api') {
      await this.api.bulkImport(cleaned);
    } else {
      await this.db.entries.bulkAdd(cleaned);
    }
    await this.load();
  }

  async clearAll() {
    if (this.source() === 'api') {
      await this.api.clearAll();
    } else {
      await this.db.entries.clear();
    }
    this.entries.set([]);
  }

  setFilters(patch: Partial<Filters>) {
    this.filters.update((f) => ({ ...f, ...patch }));
  }

  toggleFilterValue(key: 'types' | 'statuses' | 'genres', value: string) {
    this.filters.update((f) => {
      const next = new Set(f[key]) as Set<string>;
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...f, [key]: next } as Filters;
    });
  }

  resetFilters() {
    this.filters.set(defaultFilters());
  }

  hasActiveFilters = computed(() => {
    const f = this.filters();
    return (
      f.query !== '' ||
      f.types.size > 0 ||
      f.statuses.size > 0 ||
      f.genres.size > 0 ||
      f.likedOnly
    );
  });
}

function normalizeEntry(e: WatchEntry): WatchEntry {
  return {
    ...e,
    genres: e.genres ?? [],
    episodesWatched: e.episodesWatched ?? 0,
    liked: !!e.liked,
  };
}
