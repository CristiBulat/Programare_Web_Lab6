import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useLibrary, selectFiltered, selectAllGenres, type SortKey } from '../store/library'
import { EntryCard } from '../components/EntryCard'
import { EmptyState } from '../components/EmptyState'
import { LibraryIcon, PlusIcon, SearchIcon } from '../components/Icons'
import { STATUS_LABEL, STATUS_ORDER, TYPE_LABEL, type MediaType, type WatchStatus } from '../types'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
]

export default function Library() {
  const entries = useLibrary((s) => s.entries)
  const loaded = useLibrary((s) => s.loaded)
  const filters = useLibrary((s) => s.filters)
  const setFilters = useLibrary((s) => s.setFilters)
  const toggleFilterValue = useLibrary((s) => s.toggleFilterValue)
  const resetFilters = useLibrary((s) => s.resetFilters)

  const filtered = useLibrary(selectFiltered)
  const allGenres = useLibrary(selectAllGenres)

  const stats = useMemo(() => {
    const byStatus: Record<WatchStatus, number> = {
      watching: 0, completed: 0, plan_to_watch: 0, on_hold: 0, dropped: 0,
    }
    for (const e of entries) byStatus[e.status]++
    return byStatus
  }, [entries])

  const hasActiveFilters =
    filters.query !== '' ||
    filters.types.size > 0 ||
    filters.statuses.size > 0 ||
    filters.genres.size > 0 ||
    filters.likedOnly

  if (loaded && entries.length === 0) {
    return (
      <EmptyState
        icon={<LibraryIcon size={48} />}
        title="Your library is empty"
        description="Search for anime, movies and series to build your watchlist — or add an entry manually."
        action={
          <div className="flex gap-2 justify-center">
            <Link to="/search" className="btn-primary">
              <SearchIcon size={16} /> Search
            </Link>
            <Link to="/add" className="btn-outline">
              <PlusIcon size={16} /> Add manually
            </Link>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
            {stats.watching} watching · {stats.completed} completed · {stats.plan_to_watch} planned
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/search" className="btn-outline">
            <SearchIcon size={16} /> Search
          </Link>
          <Link to="/add" className="btn-primary">
            <PlusIcon size={16} /> Add
          </Link>
        </div>
      </header>

      {/* Search + sort row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted dark:text-ink-dark-muted" />
          <input
            type="search"
            placeholder="Search your library…"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            className="input pl-9"
          />
        </div>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ sort: e.target.value as SortKey })}
          className="input md:w-56"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Type</span>
          {(['anime', 'movie', 'series'] as MediaType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleFilterValue('types', t)}
              className={`chip ${filters.types.has(t) ? 'chip-active' : ''}`}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Status</span>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleFilterValue('statuses', s)}
              className={`chip ${filters.statuses.has(s) ? 'chip-active' : ''}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilters({ likedOnly: !filters.likedOnly })}
            className={`chip ${filters.likedOnly ? 'chip-active' : ''}`}
          >
            ♥ Liked only
          </button>
        </div>

        {allGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Genre</span>
            {allGenres.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => toggleFilterValue('genres', g)}
                className={`chip ${filters.genres.has(g) ? 'chip-active' : ''}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {hasActiveFilters && (
          <button type="button" onClick={resetFilters} className="text-xs text-accent hover:underline">
            Clear filters
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No entries match"
          description="Try changing or clearing your filters."
          action={
            <button type="button" className="btn-outline" onClick={resetFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  )
}
