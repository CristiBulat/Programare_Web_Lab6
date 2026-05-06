import { useState } from 'react'

/**
 * 0–10 internal scale rendered as 5 stars (half-star steps).
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 18,
}: {
  value: number | null | undefined
  onChange?: (v: number | null) => void
  readOnly?: boolean
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0
  const stars = [1, 2, 3, 4, 5]

  function handleClick(starIdx: number, half: boolean) {
    if (readOnly || !onChange) return
    const next = starIdx * 2 - (half ? 1 : 0)
    onChange(value === next ? null : next)
  }

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Rating ${value ?? 0}/10`}>
      {stars.map((s) => {
        const filled = display >= s * 2
        const half = !filled && display >= s * 2 - 1
        return (
          <span
            key={s}
            className="relative inline-block"
            style={{ width: size, height: size }}
            onMouseLeave={() => setHover(null)}
          >
            {/* base outline */}
            <Star size={size} className="text-line dark:text-line-dark" />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? size / 2 : size }}
              >
                <Star size={size} className="text-accent" filled />
              </span>
            )}
            {!readOnly && (
              <>
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  aria-label={`Set rating to ${s * 2 - 1}`}
                  onMouseEnter={() => setHover(s * 2 - 1)}
                  onClick={() => handleClick(s, true)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  aria-label={`Set rating to ${s * 2}`}
                  onMouseEnter={() => setHover(s * 2)}
                  onClick={() => handleClick(s, false)}
                />
              </>
            )}
          </span>
        )
      })}
      {value != null && (
        <span className="ml-1.5 text-xs text-ink-muted dark:text-ink-dark-muted">{(value / 2).toFixed(1)}</span>
      )}
    </div>
  )
}

function Star({ size, className, filled }: { size: number; className: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 17.3 5.82 21l1.64-7.03L2 9.24l7.19-.62L12 2l2.81 6.62 7.19.62-5.46 4.73L18.18 21z" />
    </svg>
  )
}
