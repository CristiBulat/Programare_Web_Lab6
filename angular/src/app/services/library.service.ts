import { Injectable, computed, inject, signal } from '@angular/core';
import { DbService } from './db.service';
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
  private get db() {
    return this.dbService.db;
  }

  readonly entries = signal<WatchEntry[]>([]);
  readonly loaded = signal(false);
  readonly filters = signal<Filters>(defaultFilters());

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
    const entries = await this.db.entries.orderBy('updatedAt').reverse().toArray();
    this.entries.set(entries);
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
    const entry: WatchEntry = {
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
    const id = await this.db.entries.add(entry);
    this.entries.update((arr) => [{ ...entry, id }, ...arr]);
    return id;
  }

  async addFromSearch(result: SearchResult, status: WatchStatus = 'plan_to_watch'): Promise<number> {
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
    await this.db.entries.update(id, { ...patch, updatedAt });
    this.entries.update((arr) =>
      arr.map((e) => (e.id === id ? { ...e, ...patch, updatedAt } : e)),
    );
  }

  async remove(id: number) {
    await this.db.entries.delete(id);
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
    const now = Date.now();
    const cleaned = entries.map((e) => {
      const copy: WatchEntry = { ...e };
      delete copy.id;
      copy.createdAt = copy.createdAt ?? now;
      copy.updatedAt = copy.updatedAt ?? now;
      copy.episodesWatched = copy.episodesWatched ?? 0;
      copy.genres = copy.genres ?? [];
      return copy;
    });
    await this.db.entries.bulkAdd(cleaned);
    await this.load();
  }

  async clearAll() {
    await this.db.entries.clear();
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
