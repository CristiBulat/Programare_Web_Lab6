import type { MediaType, SearchResult } from '../types'

const BASE = 'https://www.omdbapi.com/'

interface OmdbSearchItem {
  imdbID: string
  Title: string
  Year: string
  Type: 'movie' | 'series' | 'episode'
  Poster: string
}

interface OmdbSearchResponse {
  Search?: OmdbSearchItem[]
  totalResults?: string
  Response: 'True' | 'False'
  Error?: string
}

interface OmdbDetailResponse {
  imdbID: string
  Title: string
  Year: string
  Type: 'movie' | 'series' | 'episode'
  Poster: string
  Plot?: string
  Genre?: string
  totalSeasons?: string
  Response: 'True' | 'False'
  Error?: string
}

function mapType(t: OmdbSearchItem['Type']): MediaType {
  if (t === 'movie') return 'movie'
  return 'series'
}

function parseYear(year: string): number | null {
  const m = year.match(/^\d{4}/)
  return m ? Number(m[0]) : null
}

export async function searchOmdb(
  query: string,
  apiKey: string,
  type?: 'movie' | 'series',
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  if (!query.trim()) return []
  if (!apiKey) throw new Error('Missing OMDb API key. Add it in Settings.')
  const params = new URLSearchParams({ apikey: apiKey, s: query })
  if (type) params.set('type', type)
  const res = await fetch(`${BASE}?${params}`, { signal })
  if (!res.ok) throw new Error(`OMDb ${res.status}`)
  const data = (await res.json()) as OmdbSearchResponse
  if (data.Response === 'False') {
    if (data.Error?.toLowerCase().includes('not found')) return []
    throw new Error(data.Error || 'OMDb error')
  }
  return (data.Search ?? [])
    .filter((it) => it.Type !== 'episode')
    .map((it) => ({
      externalId: `imdb_${it.imdbID}`,
      type: mapType(it.Type),
      title: it.Title,
      year: parseYear(it.Year),
      posterUrl: it.Poster && it.Poster !== 'N/A' ? it.Poster : undefined,
    }))
}

export async function getOmdbDetails(imdbId: string, apiKey: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ apikey: apiKey, i: imdbId, plot: 'short' })
  const res = await fetch(`${BASE}?${params}`, { signal })
  if (!res.ok) throw new Error(`OMDb ${res.status}`)
  const data = (await res.json()) as OmdbDetailResponse
  if (data.Response === 'False') throw new Error(data.Error || 'OMDb error')
  return data
}
