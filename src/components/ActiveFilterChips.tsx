import AppIcon from './AppIcon'
import type { AppIconName } from './appIcon/types'
import {
  activeFilterBarClass,
  activeFilterChipClass,
  activeFilterChipIconClass,
  activeFilterChipMainClass,
  activeFilterChipRemoveClass,
  activeFilterClearAllClass,
  activeFilterTriggerClass,
  activeFilterTriggerDotClass,
  activeFilterTriggerLabelClass,
  type FilterChipKind
} from './ui/filterControlStyles'

export type { FilterChipKind } from './ui/filterControlStyles'

export interface FilterChip {
  id: string
  label: string
  kind?: FilterChipKind
  onRemove?: () => void
}

const FILTER_CHIP_ICONS: Record<FilterChipKind, AppIconName> = {
  search: 'search',
  date: 'clock',
  category: 'folder',
  payment: 'check',
  sort: 'swap',
  other: 'filter'
}

interface ActiveFilterChipsProps {
  chips: FilterChip[]
  onOpenFilters: () => void
  onChipClick?: () => void
  onClearAll?: () => void
  filterLabel?: string
}

export default function ActiveFilterChips({
  chips,
  onOpenFilters,
  onChipClick,
  onClearAll,
  filterLabel = 'فیلتر'
}: ActiveFilterChipsProps) {
  const handleChipClick = onChipClick ?? onOpenFilters
  const hasChips = chips.length > 0
  const showClearAll = hasChips && chips.length >= 2 && Boolean(onClearAll)

  return (
    <div className={activeFilterBarClass} role="region" aria-label="فیلترهای فعال">
      <button
        type="button"
        className={activeFilterTriggerClass(hasChips)}
        onClick={onOpenFilters}
        aria-label={hasChips ? `${filterLabel} (${chips.length} فعال)` : filterLabel}
        aria-haspopup="dialog"
      >
        <AppIcon name="filter" size={16} strokeWidth={2} aria-hidden />
        <span className={activeFilterTriggerLabelClass}>{filterLabel}</span>
        {hasChips && (
          <span className={activeFilterTriggerDotClass} aria-hidden="true">
            {chips.length}
          </span>
        )}
      </button>

      {chips.map(chip => {
        const kind = chip.kind ?? 'other'
        const icon = FILTER_CHIP_ICONS[kind]

        return (
          <span key={chip.id} className={activeFilterChipClass(kind)} role="listitem">
            <button
              type="button"
              className={activeFilterChipMainClass(Boolean(handleChipClick))}
              onClick={handleChipClick}
              title={chip.label}
              aria-label={`ویرایش فیلتر ${chip.label}`}
            >
              <span className={activeFilterChipIconClass} aria-hidden="true">
                <AppIcon name={icon} size={13} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                {chip.label}
              </span>
            </button>
            {chip.onRemove && (
              <button
                type="button"
                className={activeFilterChipRemoveClass}
                onClick={chip.onRemove}
                aria-label={`حذف فیلتر ${chip.label}`}
              >
                <AppIcon name="close" size={12} strokeWidth={2.4} />
              </button>
            )}
          </span>
        )
      })}

      {showClearAll && (
        <button type="button" className={activeFilterClearAllClass} onClick={onClearAll}>
          پاک کردن همه
        </button>
      )}
    </div>
  )
}
