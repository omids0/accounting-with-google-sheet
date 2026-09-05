import AppIcon from './AppIcon'
import {
  activeFilterChipClass,
  activeFilterChipMainClass,
  activeFilterChipRemoveClass,
  activeFilterChipsClass
} from './ui/filterControlStyles'

export interface FilterChip {
  id: string
  label: string
  onRemove?: () => void
}

export default function ActiveFilterChips({
  chips,
  onChipClick
}: {
  chips: FilterChip[]
  onChipClick?: () => void
}) {
  if (chips.length === 0) return null

  return (
    <div className={activeFilterChipsClass} role="list" aria-label="فیلترهای فعال">
      {chips.map(chip => (
        <span key={chip.id} className={activeFilterChipClass} role="listitem">
          <button
            type="button"
            className={activeFilterChipMainClass(Boolean(onChipClick))}
            onClick={onChipClick}
            disabled={!onChipClick}
            aria-label={`ویرایش فیلتر ${chip.label}`}
          >
            {chip.label}
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
      ))}
    </div>
  )
}
