import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../store/library'
import { STATUS_LABEL, STATUS_ORDER, TYPE_LABEL, type MediaType, type WatchStatus } from '../types'

export default function AddManual() {
  const addManual = useLibrary((s) => s.addManual)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<MediaType>('movie')
  const [status, setStatus] = useState<WatchStatus>('plan_to_watch')
  const [year, setYear] = useState('')
  const [poster, setPoster] = useState('')
  const [genres, setGenres] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [notes, setNotes] = useState('')
  const [episodesTotal, setEpisodesTotal] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    const yearNum = year.trim() ? Number(year) : null
    const epTotal = episodesTotal.trim() ? Number(episodesTotal) : null
    const id = await addManual({
      title: title.trim(),
      type,
      status,
      year: Number.isFinite(yearNum as number) ? (yearNum as number) : null,
      posterUrl: poster.trim() || undefined,
      genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
      synopsis: synopsis.trim() || undefined,
      notes: notes.trim() || undefined,
      episodesTotal: Number.isFinite(epTotal as number) ? (epTotal as number) : null,
    })
    navigate(`/entry/${id}`)
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Add manually</h1>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          For titles you can't find via search.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider">Title *</label>
          <input
            autoFocus
            required
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider">Type</label>
            <select className="input mt-1" value={type} onChange={(e) => setType(e.target.value as MediaType)}>
              {(['anime', 'movie', 'series'] as MediaType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider">Status</label>
            <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as WatchStatus)}>
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider">Year</label>
            <input className="input mt-1" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider">
              {type === 'movie' ? '—' : 'Total episodes'}
            </label>
            <input
              className="input mt-1"
              inputMode="numeric"
              disabled={type === 'movie'}
              value={episodesTotal}
              onChange={(e) => setEpisodesTotal(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider">Poster URL</label>
          <input className="input mt-1" value={poster} onChange={(e) => setPoster(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider">Genres (comma-separated)</label>
          <input className="input mt-1" value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Action, Drama" />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider">Synopsis</label>
          <textarea className="input mt-1 min-h-[80px]" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider">My notes</label>
          <textarea className="input mt-1 min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn-outline" onClick={() => navigate('/')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting || !title.trim()}>
            Add to library
          </button>
        </div>
      </form>
    </div>
  )
}
