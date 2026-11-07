import type { SlotsStore } from '../../../stores/createSlotsStore'
import type { QuickAction } from '../../dashboard/quickActionCatalog'
import { FormSelect } from '../../form'
import Button from '../../ui/Button'
import {
  displaySettingsRowHintClass,
  displaySettingsRowStackClass,
  displaySettingsRowTitleClass
} from '../../ui/displaySettingsStyles'

interface DisplaySlotPickerProps {
  title: string
  hint: string
  /** Names slot n: «${slotLabel} ${n}». */
  slotLabel: string
  /** The reset button's name; two pickers share a page, so each says what it resets. */
  resetLabel: string
  options: QuickAction[]
  /** The store of the list being picked; one select per slot. */
  store: SlotsStore
}

/** Settings › «نمایش»: one select per slot to choose what sits there, and a way back to the default. */
export default function DisplaySlotPicker({
  title,
  hint,
  slotLabel,
  resetLabel,
  options,
  store
}: DisplaySlotPickerProps) {
  const { ids, setSlot, reset } = store
  const selectOptions = options.map(action => ({ value: action.id, label: action.label }))

  return (
    <div className={displaySettingsRowStackClass}>
      <div className="flex flex-col gap-1">
        <span className={displaySettingsRowTitleClass}>{title}</span>
        <span className={displaySettingsRowHintClass}>{hint}</span>
      </div>
      {ids.map((id, slot) => (
        <FormSelect
          key={slot}
          label={`${slotLabel} ${slot + 1}`}
          value={id}
          onChange={next => setSlot(slot, next)}
          options={selectOptions}
          compact
        />
      ))}
      <Button variant="secondary" size="sm" className="self-start" onClick={reset}>
        {resetLabel}
      </Button>
    </div>
  )
}
