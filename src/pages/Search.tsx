import { useEffect, useRef, useState } from 'react'
import { searchAnime } from '../api/jikan'
import { searchOmdb } from '../api/omdb'
import { Spinner } from '../components/Spinner'
import { Poster } from '../components/Poster'
import { CheckIcon, PlusIcon, SearchIcon } from '../components/Icons'
import { useLibrary } from '../store/library'
import { useSettings } from '../store/settings'
import type { MediaType, SearchResult } from '../types'
import { TYPE_LABEL } from '../types'
import { useNavigate } from 'react-router-dom'

const TABS: { type: MediaType; label: string }[] = [
  { type: 'anime', label: 'Anime' },
  { type: 'movie', label: 'Movies' },
  { type: 'series', label: 'Series' },
]

export default function SearchPage() {
  const [tab, setTab] = useState<MediaType>('anime')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const omdbKey = useSettings((s) => s.omdbKey)
  const entries = useLibrary((s) => s.entries)
  const addFromSearch = useLibrary((s) => s.addFromSearch)
  const navigate = useNavigate()
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    const handle = setTimeout(async () => {
      try {
        let data: SearchResult[]
        if (tab === 'anime') {
          data = await searchAnime(trimmed, ctrl.signal)
        } else {
          data = await searchOmdb(trimmed, omdbKey, tab, ctrl.signal)
        }
        if (!ctrl.signal.aborted) setResults(data)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError((e as Error).message)
        setResults([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 400)
    return () => {
      clearTimeout(handle)
      ctrl.abort()
    }
  }, [query, tab, omdbKey])

  const savedExternalIds = new Set(entries.map((e) => e.externalId).filter(Boolean) as string[])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          Find titles via Jikan (anime) and OMDb (movies/series).
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-elevated dark:bg-elevated-dark rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setTab(t.type)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.type
                ? 'bg-surface dark:bg-surface-dark shadow-sm'
                : 'text-ink-muted dark:text-ink-dark-muted hover:text-ink dark:hover:text-ink-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${TABS.find((t) => t.type === tab)?.label.toLowerCase()}…`}
          className="input pl-10"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner size={16} />
          </span>
        )}
      </div>

      {tab !== 'anime' && !omdbKey && (
        <div className="card p-4 text-sm">
          <strong>OMDb key required</strong> to search movies/series.{' '}
          <a
            className="text-accent hover:underline"
            href="https://www.omdbapi.com/apikey.aspx"
            target="_blank"
            rel="noreferrer"
          >
            Get a free key
          </a>{' '}
          and paste it in <a className="text-accent hover:underline" href="/settings">Settings</a>.
        </div>
      )}

      {error && (
        <div className="card p-4 text-sm text-danger border-danger/40">{error}</div>
      )}

      {!loading && results.length === 0 && query.trim() !== '' && !error && (
        <div className="text-sm text-ink-muted dark:text-ink-dark-muted">No results.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {results.map((r) => {
          const saved = r.externalId ? savedExternalIds.has(r.externalId) : false
          return (
            <div key={r.externalId} className="card overflow-hidden flex flex-col">
              <div className="aspect-[2/3] w-full">
                <Poster src={r.posterUrl} type={r.type} alt={r.title} className="w-full h-full" />
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-0.5">
                  {TYPE_LABEL[r.type]}
                  {r.year ? ` · ${r.year}` : ''}
                </div>
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-3">{r.title}</h3>
                <button
                  type="button"
                  disabled={saved}
                  onClick={async () => {
                    const id = await addFromSearch(r)
                    navigate(`/entry/${id}`)
                  }}
                  className={`mt-auto btn ${saved ? 'btn-outline opacity-60 cursor-default' : 'btn-primary'}`}
                >
                  {saved ? <><CheckIcon size={14} /> In library</> : <><PlusIcon size={14} /> Add</>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
