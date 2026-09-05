import { useEffect, useState, type CSSProperties } from 'react'

import SpeedDialIcon from './SpeedDialIcon'
import { cn } from '../utils/cn'
import {
  fabContainerClass,
  speedDialActionClass,
  speedDialActionIconClass,
  speedDialActionWrapClass,
  speedDialActionsClass,
  speedDialBackdropClass,
  speedDialClass,
  speedDialContainerClass,
  speedDialTriggerClass,
  speedDialTriggerIconClass
} from './ui/speedDialStyles'
import { getPageSpeedDialConfig, type PageSpeedDialAction } from '../hooks/usePageSpeedDial'

export default function PageSpeedDial({
  actions,
  ariaLabel
}: {
  actions: PageSpeedDialAction[]
  ariaLabel: string
}) {
  const [open, setOpen] = useState(false)

  const handleClose = () => setOpen(false)

  const handleOpen = () => setOpen(true)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }

    document.addEventListener('keydown', onKeyDown)

    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      {open && (
        <button
          type="button"
          className={speedDialBackdropClass}
          onClick={handleClose}
          aria-label="بستن"
        />
      )}

      <div className={cn(fabContainerClass, speedDialContainerClass)}>
        <div className={speedDialClass}>
          <div className={speedDialActionsClass} role="menu">
            {actions.map((action, index) => (
              <div
                key={action.id}
                className={speedDialActionWrapClass(open)}
                style={{ '--action-index': index } as CSSProperties}
              >
                <button
                  type="button"
                  className={action.className ?? speedDialActionClass}
                  role="menuitem"
                  onClick={() => {
                    const latest = getPageSpeedDialConfig()?.actions.find(
                      item => item.id === action.id
                    )

                    if (latest?.disabled) return
                    latest?.onClick()
                    handleClose()
                  }}
                  disabled={action.disabled}
                  aria-label={action.label}
                >
                  <span className={speedDialActionIconClass}>{action.icon}</span>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={speedDialTriggerClass(open)}
            onClick={() => (open ? handleClose() : handleOpen())}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            <span className={speedDialTriggerIconClass(open)}>
              {open ? <SpeedDialIcon name="close" /> : <SpeedDialIcon name="add" />}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
