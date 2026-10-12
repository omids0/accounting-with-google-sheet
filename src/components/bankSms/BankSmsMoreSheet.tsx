import PickerSheet from '../form/PickerSheet'
import { smsMenuItemClass, smsMenuListClass } from '../ui/bankSmsStyles'

export type SmsMenuAction = { id: string; label: string; onSelect: () => void; disabled?: boolean }

type BankSmsMoreSheetProps = {
  open: boolean
  title: string
  actions: SmsMenuAction[]
  onClose: () => void
}

/** The card's «⋯»: the less common actions, one per row. */
export default function BankSmsMoreSheet({ open, title, actions, onClose }: BankSmsMoreSheetProps) {
  return (
    <PickerSheet open={open} title={title} onClose={onClose}>
      <ul className={smsMenuListClass}>
        {actions.map(action => (
          <li key={action.id}>
            <button
              type="button"
              className={smsMenuItemClass}
              disabled={action.disabled}
              onClick={() => {
                onClose()
                action.onSelect()
              }}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </PickerSheet>
  )
}
