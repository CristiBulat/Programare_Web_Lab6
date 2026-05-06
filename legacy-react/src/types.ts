export type MediaType = 'anime' | 'movie' | 'series'

export type WatchStatus =
  | 'watching'
  | 'completed'
  | 'plan_to_watch'
  | 'on_hold'
  | 'dropped'

export interface WatchEntry {
  id?: number
  /** External provider id, e.g. mal_12345 / imdb_tt0111161. Used for de-dup. */
  externalId?: string
  type: MediaType
  title: string
  year?: number | null
  posterUrl?: string
  synopsis?: string
  genres: string[]
  /** 0-10 scale (we render half-stars on a 5-star scale). */
  rating?: number | null
  liked: boolean
  status: WatchStatus
  notes?: string
  /** anime: episodes; movie: 1; series: total episodes if known */
  episodesTotal?: number | null
  episodesWatched?: number
  createdAt: number
  updatedAt: number
}

export interface SearchResult {
  externalId: string
  type: MediaType
  title: string
  year?: number | null
  posterUrl?: string
  synopsis?: string
  genres?: string[]
}

export const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  plan_to_watch: 'Plan to watch',
  on_hold: 'On hold',
  dropped: 'Dropped',
}

export const TYPE_LABEL: Record<MediaType, string> = {
  anime: 'Anime',
  movie: 'Movie',
  series: 'Series',
}

export const STATUS_ORDER: WatchStatus[] = [
  'watching',
  'plan_to_watch',
  'completed',
  'on_hold',
  'dropped',
]
