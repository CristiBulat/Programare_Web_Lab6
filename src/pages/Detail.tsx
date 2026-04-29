import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLibrary } from '../store/library'
import { Poster } from '../components/Poster'
import { StarRating } from '../components/StarRating'
import { ArrowLeftIcon, CheckIcon, HeartIcon, PencilIcon, TrashIcon, XIcon } from '../components/Icons'
import { STATUS_LABEL, STATUS_ORDER, TYPE_LABEL, type WatchStatus } from '../types'
import { EmptyState } from '../components/EmptyState'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const numId = id ? Number(id) : Number.NaN
  const entry = useLibrary((s) => s.entries.find((e) => e.id === numId))
  const update = useLibrary((s) => s.update)
  const remove = useLibrary((s) => s.remove)
  const setStatus = useLibrary((s) => s.setStatus)
  const toggleLiked = useLibrary((s) => s.toggleLiked)
  const setRating = useLibrary((s) => s.setRating)

  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftYear, setDraftYear] = useState('')
  const [draftPoster, setDraftPoster] = useState('')
  const [draftSynopsis, setDraftSynopsis] = useState('')
  const [draftGenres, setDraftGenres] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftEpTotal, setDraftEpTotal] = useState('')

  if (!entry) {
    return (
      <EmptyState
        title="Entry not found"
        description="It may have been deleted."
        action={
          <Link to="/" className="btn-outline">
            Back to library
          </Link>
        }
      />
    )
  }

  function startEdit() {
    if (!entry) return
    setDraftTitle(entry.title)
    setDraftYear(entry.year ? String(entry.year) : '')
    setDraftPoster(entry.posterUrl ?? '')
    setDraftSynopsis(entry.synopsis ?? '')
    setDraftGenres(entry.genres.join(', '))
    setDraftNotes(entry.notes ?? '')
    setDraftEpTotal(entry.episodesTotal != null ? String(entry.episodesTotal) : '')
    setEditing(true)
  }

  async function saveEdit() {
    if (entry?.id == null) return
    const yearNum = draftYear.trim() ? Number(draftYear) : null
    const epTotal = draftEpTotal.trim() ? Number(draftEpTotal) : null
    await update(entry.id, {
      title: draftTitle.trim() || entry.title,
      year: Number.isFinite(yearNum as number) ? (yearNum as number) : null,
      posterUrl: draftPoster.trim() || undefined,
      synopsis: draftSynopsis.trim() || undefined,
      genres: draftGenres.split(',').map((g) => g.trim()).filter(Boolean),
      notes: draftNotes.trim() || undefined,
      episodesTotal: Number.isFinite(epTotal as number) ? (epTotal as number) : null,
    })
    setEditing(false)
  }

  async function handleDelete() {
    if (entry?.id == null) return
    if (!confirm(`Remove "${entry.title}" from your library?`)) return
    await remove(entry.id)
    navigate('/')
  }

  async function handleEpisodesWatched(delta: number) {
    if (entry?.id == null) return
    const next = Math.max(0, (entry.episodesWatched ?? 0) + delta)
    const cap = entry.episodesTotal ?? Number.POSITIVE_INFINITY
    await update(entry.id, { episodesWatched: Math.min(next, cap) })
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-2">
        <ArrowLeftIcon size={16} /> Back
      </button>

      <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-8">
        <div>
          <div className="aspect-[2/3] w-full max-w-[260px] mx-auto md:mx-0 overflow-hidden rounded-xl border border-line dark:border-line-dark">
            <Poster src={entry.posterUrl} type={entry.type} alt={entry.title} className="w-full h-full" />
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-3 justify-between">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-1">
                {TYPE_LABEL[entry.type]}
                {entry.year ? ` · ${entry.year}` : ''}
              </div>
              <h1 className="text-3xl font-bold leading-tight">{entry.title}</h1>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => entry.id != null && toggleLiked(entry.id)}
                className={`btn ${entry.liked ? 'bg-accent text-white hover:bg-accent-hover' : 'btn-outline'}`}
                aria-label={entry.liked ? 'Unlike' : 'Like'}
              >
                <HeartIcon size={16} filled={entry.liked} /> {entry.liked ? 'Liked' : 'Like'}
              </button>
              {!editing ? (
                <button type="button" onClick={startEdit} className="btn-outline">
                  <PencilIcon size={16} /> Edit
                </button>
              ) : (
                <button type="button" onClick={() => setEditing(false)} className="btn-outline">
                  <XIcon size={16} /> Cancel
                </button>
              )}
              <button type="button" onClick={handleDelete} className="btn-outline text-danger hover:bg-danger/10">
                <TrashIcon size={16} />
              </button>
            </div>
          </div>

          {/* Status row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mr-1">Status</span>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => entry.id != null && setStatus(entry.id, s as WatchStatus)}
                className={`chip ${entry.status === s ? 'chip-active' : ''}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Rating</span>
            <StarRating
              value={entry.rating}
              onChange={(v) => entry.id != null && setRating(entry.id, v)}
            />
          </div>

          {/* Episodes */}
          {(entry.type === 'anime' || entry.type === 'series') && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted">Episodes</span>
              <div className="inline-flex items-center gap-2">
                <button type="button" className="btn-outline h-8 w-8 p-0" onClick={() => handleEpisodesWatched(-1)}>−</button>
                <span className="font-medium tabular-nums">
                  {entry.episodesWatched ?? 0}
                  {entry.episodesTotal ? ` / ${entry.episodesTotal}` : ''}
                </span>
                <button type="button" className="btn-outline h-8 w-8 p-0" onClick={() => handleEpisodesWatched(1)}>+</button>
              </div>
            </div>
          )}

          {/* Genres */}
          {entry.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {entry.genres.map((g) => (
                <span key={g} className="chip cursor-default">{g}</span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {entry.synopsis && !editing && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-2">Synopsis</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{entry.synopsis}</p>
            </div>
          )}

          {/* Notes */}
          {entry.notes && !editing && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-2">My notes</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{entry.notes}</p>
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="card p-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider">Title</label>
                <input className="input mt-1" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider">Year</label>
                  <input className="input mt-1" value={draftYear} inputMode="numeric" onChange={(e) => setDraftYear(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider">
                    {entry.type === 'movie' ? '—' : 'Total episodes'}
                  </label>
                  <input
                    className="input mt-1"
                    value={draftEpTotal}
                    inputMode="numeric"
                    disabled={entry.type === 'movie'}
                    onChange={(e) => setDraftEpTotal(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider">Poster URL</label>
                <input className="input mt-1" value={draftPoster} onChange={(e) => setDraftPoster(e.target.value)} placeholder="https://…" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider">Genres (comma-separated)</label>
                <input className="input mt-1" value={draftGenres} onChange={(e) => setDraftGenres(e.target.value)} placeholder="Action, Drama" />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider">Synopsis</label>
                <textarea className="input mt-1 min-h-[80px]" value={draftSynopsis} onChange={(e) => setDraftSynopsis(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider">My notes</label>
                <textarea className="input mt-1 min-h-[80px]" value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                <button type="button" className="btn-primary" onClick={saveEdit}>
                  <CheckIcon size={16} /> Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
