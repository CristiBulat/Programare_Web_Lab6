import type { SearchResult } from '../types'

const BASE = 'https://api.jikan.moe/v4'

interface JikanAnime {
  mal_id: number
  title: string
  title_english?: string | null
  year?: number | null
  aired?: { from?: string | null }
  synopsis?: string | null
  images?: { jpg?: { image_url?: string; large_image_url?: string } }
  genres?: { name: string }[]
  episodes?: number | null
}

export async function searchAnime(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  if (!query.trim()) return []
  const url = `${BASE}/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Jikan ${res.status}`)
  const data = (await res.json()) as { data: JikanAnime[] }
  return data.data.map((a) => {
    const year = a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : null)
    return {
      externalId: `mal_${a.mal_id}`,
      type: 'anime' as const,
      title: a.title_english || a.title,
      year,
      posterUrl: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
      synopsis: a.synopsis ?? undefined,
      genres: a.genres?.map((g) => g.name) ?? [],
    }
  })
}

export async function getAnimeDetails(malId: string | number, signal?: AbortSignal) {
  const url = `${BASE}/anime/${malId}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Jikan ${res.status}`)
  const data = (await res.json()) as { data: JikanAnime }
  return data.data
}
