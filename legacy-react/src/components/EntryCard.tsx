import { Link } from 'react-router-dom'
import { useLibrary } from '../store/library'
import { TYPE_LABEL, type WatchEntry } from '../types'
import { HeartIcon } from './Icons'
import { Poster } from './Poster'
import { StatusBadge } from './StatusBadge'

export function EntryCard({ entry }: { entry: WatchEntry }) {
  const toggleLiked = useLibrary((s) => s.toggleLiked)

  return (
    <Link
      to={`/entry/${entry.id}`}
      className="card group overflow-hidden flex flex-col hover:border-accent/50 transition-colors"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Poster
          src={entry.posterUrl}
          type={entry.type}
          alt={entry.title}
          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            if (entry.id != null) toggleLiked(entry.id)
          }}
          aria-label={entry.liked ? 'Unlike' : 'Like'}
          className={`absolute top-2 right-2 h-8 w-8 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
            entry.liked
              ? 'bg-accent text-white'
              : 'bg-black/30 text-white hover:bg-black/50'
          }`}
        >
          <HeartIcon size={16} filled={entry.liked} />
        </button>
        <div className="absolute bottom-2 left-2">
          <StatusBadge status={entry.status} />
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-xs uppercase tracking-wider text-ink-muted dark:text-ink-dark-muted mb-0.5">
          {TYPE_LABEL[entry.type]}
          {entry.year ? ` · ${entry.year}` : ''}
        </div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{entry.title}</h3>
        {entry.rating != null && (
          <div className="text-xs text-accent mt-1 font-medium">★ {(entry.rating / 2).toFixed(1)}/5</div>
        )}
      </div>
    </Link>
  )
}
