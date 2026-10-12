import { useEffect, useRef, useState, type CSSProperties } from 'react'

import DesktopHeaderPortal from './layout/DesktopHeaderPortal'
import PageHeaderActions from './layout/PageHeaderActions'
import SpeedDialIcon from './SpeedDialIcon'
import { useHideOnScroll } from '../hooks/useHideOnScroll'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { useRegisterOverlay } from '../hooks/useRegisterOverlay'
import { cn } from '../utils/cn'
import { moveFocusWithArrows } from '../utils/keyboardNav'
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

  const triggerRef = useRef<HTMLButtonElement>(null)

  const menuRef = useRef<HTMLDivElement>(null)

  const handleClose = () => setOpen(false)

  const handleOpen = () => setOpen(true)

  // Escape closes the menu and returns focus to the + button (round 5, F4).
  useRegisterOverlay(open, () => {
    handleClose()
    triggerRef.current?.focus()
  })

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []
    )

  // Opening moves focus to the action next to the + button; ↑↓ walk the stack.
  useEffect(() => {
    if (open) menuItems()[0]?.focus()
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
        <div className={speedDialClass(hidden)} onFocusCapture={reveal}>
          <div
            ref={menuRef}
            className={speedDialActionsClass}
            role="menu"
            aria-label={ariaLabel}
            tabIndex={-1}
            onKeyDown={event => {
              if (event.key === 'Tab') handleClose()
              else moveFocusWithArrows(event, menuItems(), { axis: 'vertical' })
            }}
          >
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
                  // Only reachable through the open menu, never by Tab while hidden.
                  tabIndex={-1}
                  onClick={() => {
                    // A modal opened by the action hands focus back to + when it closes.
                    triggerRef.current?.focus()
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
            ref={triggerRef}
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
