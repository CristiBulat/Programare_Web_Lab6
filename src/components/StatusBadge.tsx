import { STATUS_LABEL, type WatchStatus } from '../types'

const STYLE: Record<WatchStatus, string> = {
  watching: 'bg-accent/10 text-accent ring-1 ring-accent/30',
  completed: 'bg-success/10 text-success ring-1 ring-success/30',
  plan_to_watch: 'bg-elevated dark:bg-elevated-dark text-ink dark:text-ink-dark ring-1 ring-line dark:ring-line-dark',
  on_hold: 'bg-warning/10 text-warning ring-1 ring-warning/30',
  dropped: 'bg-danger/10 text-danger ring-1 ring-danger/30',
}

export function StatusBadge({ status }: { status: WatchStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
