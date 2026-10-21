import { cn } from '../../utils/cn'
import PickerSheet from '../form/PickerSheet'
import { buildingRowTitleClass } from '../ui/buildingStyles'
import { calmListClass, calmRowClass } from '../ui/calmListStyles'

export interface RowAction {
  id: string
  label: string
  /** A link (`tel:`, `sms:`); without it the action is a button. */
  href?: string
  onClick?: () => void
  danger?: boolean
}

const rowClass = cn(calmRowClass, 'w-full cursor-pointer bg-transparent text-start no-underline')

/** The «⋯» menu of a list row: a short sheet of actions (call, SMS, edit, change resident…). */
export default function RowActionsSheet({
  open,
  title,
  actions,
  onClose
}: {
  open: boolean
  title: string
  actions: RowAction[]
  onClose: () => void
}) {
  return (
    <PickerSheet open={open} title={title} onClose={onClose}>
      <ul className={calmListClass}>
        {actions.map(action => {
          const label = (
            <span className={cn(buildingRowTitleClass, action.danger && 'text-danger')}>
              {action.label}
            </span>
          )

          return (
            <li key={action.id}>
              {action.href ? (
                <a className={rowClass} href={action.href} onClick={onClose}>
                  {label}
                </a>
              ) : (
                <button
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    onClose()
                    action.onClick?.()
                  }}
                >
                  {label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </PickerSheet>
  )
}
