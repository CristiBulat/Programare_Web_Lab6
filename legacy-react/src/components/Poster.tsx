import { useState } from 'react'
import type { MediaType } from '../types'
import { FilmIcon, SparklesIcon, TvIcon } from './Icons'

export function Poster({
  src,
  type,
  alt,
  className = '',
}: {
  src?: string
  type: MediaType
  alt: string
  className?: string
}) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <div
        className={`flex items-center justify-center bg-elevated dark:bg-elevated-dark text-ink-muted dark:text-ink-dark-muted ${className}`}
        role="img"
        aria-label={alt}
      >
        {type === 'anime' ? (
          <SparklesIcon size={32} />
        ) : type === 'movie' ? (
          <FilmIcon size={32} />
        ) : (
          <TvIcon size={32} />
        )}
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setErrored(true)}
      className={`object-cover bg-elevated dark:bg-elevated-dark ${className}`}
    />
  )
}
