export type MediaType = 'anime' | 'movie' | 'series';

export type WatchStatus =
  | 'watching'
  | 'completed'
  | 'plan_to_watch'
  | 'on_hold'
  | 'dropped';

export interface WatchEntry {
  id?: number;
  externalId?: string;
  type: MediaType;
  title: string;
  year?: number | null;
  posterUrl?: string;
  synopsis?: string;
  genres: string[];
  rating?: number | null;
  liked: boolean;
  status: WatchStatus;
  notes?: string;
  episodesTotal?: number | null;
  episodesWatched?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  externalId: string;
  type: MediaType;
  title: string;
  year?: number | null;
  posterUrl?: string;
  synopsis?: string;
  genres?: string[];
}

export const STATUS_LABEL: Record<WatchStatus, string> = {
  watching: 'Watching',
  completed: 'Completed',
  plan_to_watch: 'Plan to watch',
  on_hold: 'On hold',
  dropped: 'Dropped',
};

export const TYPE_LABEL: Record<MediaType, string> = {
  anime: 'Anime',
  movie: 'Movie',
  series: 'Series',
};

export const STATUS_ORDER: WatchStatus[] = [
  'watching',
  'plan_to_watch',
  'completed',
  'on_hold',
  'dropped',
];

export const TYPES: MediaType[] = ['anime', 'movie', 'series'];

export type SortKey = 'updated' | 'title' | 'rating' | 'year';
