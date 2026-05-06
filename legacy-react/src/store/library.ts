import { create } from 'zustand'
import { db } from '../db'
import type { MediaType, SearchResult, WatchEntry, WatchStatus } from '../types'

export type SortKey = 'updated' | 'title' | 'rating' | 'year'

interface Filters {
  query: string
  types: Set<MediaType>
  statuses: Set<WatchStatus>
  genres: Set<string>
  likedOnly: boolean
  sort: SortKey
}

interface LibraryState {
  entries: WatchEntry[]
  loaded: boolean
  filters: Filters
  load: () => Promise<void>
  addManual: (input: Omit<WatchEntry, 'id' | 'createdAt' | 'updatedAt' | 'genres' | 'liked' | 'episodesWatched'> & {
    genres?: string[]
    liked?: boolean
    episodesWatched?: number
  }) => Promise<number>
  addFromSearch: (result: SearchResult, status?: WatchStatus) => Promise<number>
  update: (id: number, patch: Partial<WatchEntry>) => Promise<void>
  remove: (id: number) => Promise<void>
  toggleLiked: (id: number) => Promise<void>
  setStatus: (id: number, status: WatchStatus) => Promise<void>
  setRating: (id: number, rating: number | null) => Promise<void>
  importMany: (entries: WatchEntry[]) => Promise<void>
  clearAll: () => Promise<void>
  setFilters: (patch: Partial<Filters>) => void
  toggleFilterValue: <K extends 'types' | 'statuses' | 'genres'>(key: K, value: string) => void
  resetFilters: () => void
}

const defaultFilters: Filters = {
  query: '',
  types: new Set(),
  statuses: new Set(),
  genres: new Set(),
  likedOnly: false,
  sort: 'updated',
}

export const useLibrary = create<LibraryState>((set, get) => ({
  entries: [],
  loaded: false,
  filters: defaultFilters,

  async load() {
    const entries = await db.entries.orderBy('updatedAt').reverse().toArray()
    set({ entries, loaded: true })
  },

  async addManual(input) {
    const now = Date.now()
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
    }
    const id = await db.entries.add(entry)
    set({ entries: [{ ...entry, id }, ...get().entries] })
    return id
  },

  async addFromSearch(result, status = 'plan_to_watch') {
    if (result.externalId) {
      const existing = await db.entries.where('externalId').equals(result.externalId).first()
      if (existing && existing.id != null) return existing.id
    }
    const now = Date.now()
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
    }
    const id = await db.entries.add(entry)
    set({ entries: [{ ...entry, id }, ...get().entries] })
    return id
  },

  async update(id, patch) {
    const updatedAt = Date.now()
    await db.entries.update(id, { ...patch, updatedAt })
    set({
      entries: get().entries.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt } : e,
      ),
    })
  },

  async remove(id) {
    await db.entries.delete(id)
    set({ entries: get().entries.filter((e) => e.id !== id) })
  },

  async toggleLiked(id) {
    const e = get().entries.find((x) => x.id === id)
    if (!e) return
    await get().update(id, { liked: !e.liked })
  },

  async setStatus(id, status) {
    await get().update(id, { status })
  },

  async setRating(id, rating) {
    await get().update(id, { rating })
  },

  async importMany(entries) {
    const now = Date.now()
    const cleaned = entries.map((e) => {
      const copy: WatchEntry = { ...e }
      delete copy.id
      copy.createdAt = copy.createdAt ?? now
      copy.updatedAt = copy.updatedAt ?? now
      copy.episodesWatched = copy.episodesWatched ?? 0
      copy.genres = copy.genres ?? []
      return copy
    })
    await db.entries.bulkAdd(cleaned)
    await get().load()
  },

  async clearAll() {
    await db.entries.clear()
    set({ entries: [] })
  },

  setFilters(patch) {
    set({ filters: { ...get().filters, ...patch } })
  },

  toggleFilterValue(key, value) {
    const next = new Set(get().filters[key]) as Set<string>
    if (next.has(value)) next.delete(value)
    else next.add(value)
    set({ filters: { ...get().filters, [key]: next } as Filters })
  },

  resetFilters() {
    set({ filters: { ...defaultFilters, types: new Set(), statuses: new Set(), genres: new Set() } })
  },
}))

export function selectFiltered(s: LibraryState): WatchEntry[] {
  const { entries, filters } = s
  const q = filters.query.trim().toLowerCase()
  let out = entries.filter((e) => {
    if (q && !e.title.toLowerCase().includes(q)) return false
    if (filters.types.size && !filters.types.has(e.type)) return false
    if (filters.statuses.size && !filters.statuses.has(e.status)) return false
    if (filters.likedOnly && !e.liked) return false
    if (filters.genres.size) {
      const hit = e.genres.some((g) => filters.genres.has(g))
      if (!hit) return false
    }
    return true
  })
  out = [...out].sort((a, b) => {
    switch (filters.sort) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'rating':
        return (b.rating ?? -1) - (a.rating ?? -1)
      case 'year':
        return (b.year ?? 0) - (a.year ?? 0)
      case 'updated':
      default:
        return b.updatedAt - a.updatedAt
    }
  })
  return out
}

export function selectAllGenres(s: LibraryState): string[] {
  const set = new Set<string>()
  for (const e of s.entries) for (const g of e.genres) set.add(g)
  return [...set].sort()
}
