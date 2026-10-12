import { getPageSpeedDialConfig, type PageSpeedDialAction } from '../../hooks/usePageSpeedDial'
import { moveFocusWithArrows } from '../../utils/keyboardNav'
import { headerActionBtnClass, headerPrimaryActionClass } from '../ui/layoutStyles'

/** Runs the latest registered handler, as the floating speed dial does. */
function runAction(id: string) {
  const latest = getPageSpeedDialConfig()?.actions.find(item => item.id === id)

  if (latest && !latest.disabled) latest.onClick()
}

/** Adding things (add, add-expense, income, expense) is the page's primary action. */
const isPrimary = (action: PageSpeedDialAction) => /^(add|income|expense)/.test(action.id)

/**
 * The speed dial's actions as desktop header buttons: secondary actions as icon
 * buttons, the primary one(s) as a labelled pill at the end of the row.
 */
export default function PageHeaderActions({
  actions,
  ariaLabel
}: {
  actions: PageSpeedDialAction[]
  ariaLabel: string
}) {
  const primary = actions.filter(isPrimary)
  const secondary = actions.filter(action => !isPrimary(action))

  return (
    <div
      className="flex items-center gap-1.5"
      role="toolbar"
      aria-label={ariaLabel}
      // A toolbar moves with ←→ (by what is on screen, so RTL just works) and Home/End.
      onKeyDown={event =>
        moveFocusWithArrows(
          event,
          Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)')),
          { axis: 'horizontal' }
        )
      }
    >
      {secondary.map(action => (
        <button
          key={action.id}
          type="button"
          className={headerActionBtnClass}
          onClick={() => runAction(action.id)}
          disabled={action.disabled}
          aria-label={action.label}
          title={action.label}
        >
          {action.icon}
        </button>
      ))}
      {primary.map(action => (
        <button
          key={action.id}
          type="button"
          className={headerPrimaryActionClass}
          onClick={() => runAction(action.id)}
          disabled={action.disabled}
        >
          {action.headerLabel ?? action.label}
        </button>
      ))}
    </div>
  )
}
