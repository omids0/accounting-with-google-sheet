import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useRegisterOverlay } from '../hooks/useRegisterOverlay'
import { cn } from '../utils/cn'
import {
  helpHintActionClass,
  helpHintActionsClass,
  helpHintPopoverClass,
  helpHintTextClass,
  helpHintTitleClass,
  helpHintTriggerClass
} from './ui/helpHintStyles'

export interface HelpHintAction {
  label: string
  onClick: () => void
}

export interface HelpHintProps {
  /** The concept, e.g. «دارایی قابل اتکا»; names the trigger and heads the popover. */
  title: string
  text: string
  actions?: HelpHintAction[]
  className?: string
}

type Placement = { top?: number; bottom?: number; right: number; arrowRight: number }

const EDGE = 12

/** Only one hint is open at a time; opening another closes this one. */
let closeOpenHint: (() => void) | null = null

function placePopover(trigger: HTMLElement, popover: HTMLElement | null): Placement {
  const rect = trigger.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const width = popover?.offsetWidth ?? Math.min(288, viewportWidth - 24)
  const height = popover?.offsetHeight ?? 0
  const fromRight = viewportWidth - rect.right
  const right = Math.min(Math.max(fromRight - 16, EDGE), viewportWidth - width - EDGE)
  const arrowRight = fromRight + rect.width / 2 - right - 6
  const fitsBelow = rect.bottom + 8 + height <= window.innerHeight - EDGE

  return fitsBelow || rect.top < height
    ? { top: rect.bottom + 8, right, arrowRight }
    : { bottom: window.innerHeight - rect.top + 8, right, arrowRight }
}

/** Tabbing past either end of the popover returns to the trigger and closes it. */
function tabLeavesPopover(event: KeyboardEvent, popover: HTMLElement | null): boolean {
  const active = document.activeElement

  if (!popover || !popover.contains(active)) return false

  const buttons = popover.querySelectorAll('button')
  const first = buttons[0]
  const last = buttons[buttons.length - 1]

  return event.shiftKey ? active === popover || active === first : !last || active === last
}

/** «؟» button beside a hard concept; opens a short plain-language popover. */
export default function HelpHint({ title, text, actions, className }: HelpHintProps) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const popoverId = useId()

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useRegisterOverlay(open, close)

  useEffect(() => {
    if (!open) return

    const closeThis = () => setOpen(false)

    if (closeOpenHint && closeOpenHint !== closeThis) closeOpenHint()
    closeOpenHint = closeThis

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true)
      if (event.key === 'Tab' && tabLeavesPopover(event, popoverRef.current)) {
        event.preventDefault()
        close(true)
      }
    }
    const reposition = () => {
      if (triggerRef.current) setPlacement(placePopover(triggerRef.current, popoverRef.current))
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)

    return () => {
      if (closeOpenHint === closeThis) closeOpenHint = null
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, close])

  // Measure once the popover exists, then move focus into it for keyboard users.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    setPlacement(placePopover(triggerRef.current, popoverRef.current))
    popoverRef.current?.focus({ preventScroll: true })
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(helpHintTriggerClass, className)}
        aria-label={`راهنما: ${title}`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={event => {
          // Hints often sit inside clickable cards; the tap is for the hint only.
          event.stopPropagation()
          if (!open) setPlacement(placePopover(event.currentTarget, null))
          setOpen(!open)
        }}
      >
        ؟
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-labelledby={`${popoverId}-title`}
            tabIndex={-1}
            className={helpHintPopoverClass(placement?.bottom != null)}
            style={{
              top: placement?.top,
              bottom: placement?.bottom,
              right: placement?.right ?? EDGE,
              ['--help-arrow-right' as string]: `${placement?.arrowRight ?? 16}px`
            }}
          >
            <b id={`${popoverId}-title`} className={helpHintTitleClass}>
              {title} چیست؟
            </b>
            <p className={helpHintTextClass}>{text}</p>
            {actions?.length ? (
              <div className={helpHintActionsClass}>
                {actions.map(action => (
                  <button
                    key={action.label}
                    type="button"
                    className={helpHintActionClass}
                    onClick={() => {
                      close()
                      action.onClick()
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>,
          document.body
        )}
    </>
  )
}
