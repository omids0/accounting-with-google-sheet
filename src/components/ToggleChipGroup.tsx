import { toggleChipBtnClass, toggleChipGridClass } from './ui/recordsStyles'

export type ToggleChipOption = {
  id: string
  label: string
}

export default function ToggleChipGroup({
  options,
  selected,
  onToggle,
  ariaLabel
}: {
  options: ToggleChipOption[]
  selected: Record<string, boolean>
  onToggle: (id: string) => void
  ariaLabel: string
}) {
  return (
    <div className={toggleChipGridClass} role="group" aria-label={ariaLabel}>
      {options.map(option => {
        const active = selected[option.id] ?? false

        return (
          <button
            key={option.id}
            type="button"
            className={toggleChipBtnClass(active)}
            aria-pressed={active}
            onClick={() => onToggle(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
