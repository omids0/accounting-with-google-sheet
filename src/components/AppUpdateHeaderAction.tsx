import AppIcon from './AppIcon'
import { useAppStore } from '../stores/appStore'
import { cn } from '../utils/cn'
import { syncStatusBadgeClass, syncStatusLabelClass } from './ui/layoutStyles'

export default function AppUpdateHeaderAction() {
  const updateAvailable = useAppStore(state => state.updateAvailable)
  const updatePromptDismissed = useAppStore(state => state.updatePromptDismissed)
  const applying = useAppStore(state => state.updateApplying)
  const applyAppUpdate = useAppStore(state => state.applyAppUpdate)

  if (!updateAvailable || !updatePromptDismissed) {
    return null
  }

  return (
    <button
      type="button"
      className={cn(
        syncStatusBadgeClass,
        'cursor-pointer transition-[background,transform] duration-[var(--duration-normal)]',
        'hover:bg-white/20 active:scale-95',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75'
      )}
      onClick={applyAppUpdate}
      disabled={applying}
      aria-busy={applying}
      title="نسخه جدید آماده است"
    >
      <AppIcon name="refresh" size={14} strokeWidth={2.25} aria-hidden />
      <span className={syncStatusLabelClass}>{applying ? 'در حال بروزرسانی…' : 'بروزرسانی'}</span>
    </button>
  )
}
