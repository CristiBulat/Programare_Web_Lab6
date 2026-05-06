export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-line dark:border-line-dark border-t-accent"
      style={{ width: size, height: size }}
      aria-label="loading"
    />
  )
}
