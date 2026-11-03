import type { AppIconName } from './AppIcon'
import EmptyState from './EmptyState'

/**
 * A list that failed to load. Shown instead of the "nothing here yet" state so a failed read is
 * never mistaken for lost data, with a retry that runs the same loader as the page's refresh.
 */
export default function LoadErrorState({
  icon = 'records',
  message = 'بارگذاری انجام نشد؛ اطلاعات شما از بین نرفته است.',
  onRetry
}: {
  icon?: AppIconName
  message?: string
  onRetry: () => void
}) {
  return (
    <EmptyState
      icon={icon}
      message={message}
      action={{ label: 'تلاش دوباره', icon: 'refresh', onClick: onRetry }}
    />
  )
}
