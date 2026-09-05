import AppIcon from './AppIcon'
import { emptyStateClass, emptyStateIconClass } from './ui/displayStyles'

export default function SearchEmptyState() {
  return (
    <div className={emptyStateClass}>
      <div className={emptyStateIconClass}>
        <AppIcon name="search" />
      </div>
      <p>نتیجه‌ای یافت نشد</p>
    </div>
  )
}
