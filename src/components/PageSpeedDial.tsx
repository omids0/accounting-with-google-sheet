import { useState, type CSSProperties } from 'react'

import DesktopHeaderPortal from './layout/DesktopHeaderPortal'
import PageHeaderActions from './layout/PageHeaderActions'
import SpeedDialIcon from './SpeedDialIcon'
import { useHideOnScroll } from '../hooks/useHideOnScroll'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useRegisterOverlay } from '../hooks/useRegisterOverlay'
import { cn } from '../utils/cn'
import {
  fabContainerClass,
  speedDialActionClass,
  speedDialActionIconClass,
  speedDialActionLabelClass,
  speedDialActionWrapClass,
  speedDialActionsClass,
  speedDialBackdropClass,
  speedDialClass,
  speedDialContainerClass,
  speedDialTriggerClass,
  speedDialTriggerIconClass
} from './ui/speedDialStyles'
import { getPageSpeedDialConfig, type PageSpeedDialAction } from '../hooks/usePageSpeedDial'

interface PageSpeedDialProps {
  actions: PageSpeedDialAction[]
  ariaLabel: string
}

/**
 * One source of page actions: a floating speed dial on phones and tablets, header
 * buttons on desktop (≥ 1280px).
 */
export default function PageSpeedDial(props: PageSpeedDialProps) {
  const isDesktop = useIsDesktop()

  if (!isDesktop) return <FloatingSpeedDial {...props} />

  return (
    <DesktopHeaderPortal slot="actions">
      <PageHeaderActions {...props} />
    </DesktopHeaderPortal>
  )
}

function FloatingSpeedDial({ actions, ariaLabel }: PageSpeedDialProps) {
  const [open, setOpen] = useState(false)

  // Slides away while the page scrolls down so it never sits on card content.
  const { hidden, reveal } = useHideOnScroll({ disabled: open })

  const handleClose = () => setOpen(false)

  const handleOpen = () => setOpen(true)

  useRegisterOverlay(open, handleClose)

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
        <div className={speedDialClass(hidden)} onFocusCapture={reveal}>
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
                <span className={speedDialActionLabelClass} aria-hidden="true">
                  {action.label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={speedDialTriggerClass(open, hidden)}
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
