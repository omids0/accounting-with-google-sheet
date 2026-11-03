import { useEffect, useRef, useState, type FocusEvent, type PointerEvent } from 'react'
import toast from 'react-hot-toast'

import {
  undoToastActionClass,
  undoToastBarClass,
  undoToastClass,
  undoToastLabelClass
} from './ui/undoToastStyles'
import { holdUndoWindow } from '../utils/undoWindow'

type UndoToastProps = {
  id: string
  message: string
  durationMs: number
  onUndo: () => void
}

/** Pauses the undo window (and the countdown bar) while the toast is hovered, focused or pressed. */
function useHoldWhileInteracting(id: string) {
  const [held, setHeld] = useState(false)
  const sources = useRef({ hover: false, focus: false, press: false })

  const update = (key: 'hover' | 'focus' | 'press', value: boolean) => {
    sources.current[key] = value
    setHeld(sources.current.hover || sources.current.focus || sources.current.press)
  }

  useEffect(() => {
    holdUndoWindow(id, held)
  }, [id, held])

  return {
    held,
    handlers: {
      // Only a mouse hovers: a tap on a phone leaves no pointer behind to resume from.
      onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && update('hover', true),
      onPointerLeave: () => update('hover', false),
      onPointerDown: () => update('press', true),
      onPointerUp: () => update('press', false),
      onPointerCancel: () => update('press', false),
      onFocus: () => update('focus', true),
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget)) update('focus', false)
      }
    }
  }
}

function UndoToast({ id, message, durationMs, onUndo }: UndoToastProps) {
  const { held, handlers } = useHoldWhileInteracting(id)

  return (
    <div className={undoToastClass} role="status" aria-live="polite" {...handlers}>
      <span className={undoToastLabelClass}>{message}</span>
      <button type="button" className={undoToastActionClass} onClick={onUndo}>
        بازگردانی
      </button>
      <span
        className={undoToastBarClass}
        style={{
          animation: `undoCountdown ${durationMs}ms linear forwards`,
          animationPlayState: held ? 'paused' : 'running'
        }}
        aria-hidden
      />
    </div>
  )
}

/**
 * «… حذف شد — بازگردانی» at the bottom; the caller owns the timer (`startUndoWindow` with the
 * returned id, so hovering the toast pauses it) and dismisses the toast.
 * `message` replaces the whole text (e.g. «اجاره ثبت شد (تکراری)» after an auto post).
 */
export function showUndoToast(
  label: string,
  durationMs: number,
  onUndo: () => void,
  message = `${label} حذف شد`
): string {
  return toast.custom(
    t => <UndoToast id={t.id} message={message} durationMs={durationMs} onUndo={onUndo} />,
    {
      position: 'bottom-center',
      duration: Infinity
    }
  )
}

export function dismissUndoToast(id: string): void {
  toast.dismiss(id)
}
