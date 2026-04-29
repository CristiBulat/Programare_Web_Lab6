import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon ? <div className="mb-4 text-ink-muted dark:text-ink-dark-muted">{icon}</div> : null}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description ? (
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
