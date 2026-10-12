import toast from 'react-hot-toast'

import {
  undoToastActionClass,
  undoToastBarClass,
  undoToastClass,
  undoToastLabelClass
} from './ui/undoToastStyles'

type UndoToastProps = {
  message: string
  durationMs: number
  onUndo: () => void
}

function UndoToast({ message, durationMs, onUndo }: UndoToastProps) {
  return (
    <div className={undoToastClass} role="status" aria-live="polite">
      <span className={undoToastLabelClass}>{message}</span>
      <button type="button" className={undoToastActionClass} onClick={onUndo}>
        بازگردانی
      </button>
      <span
        className={undoToastBarClass}
        style={{ animation: `undoCountdown ${durationMs}ms linear forwards` }}
        aria-hidden
      />
    </div>
  )
}

/** «… حذف شد — بازگردانی» at the bottom; the caller owns the timer and dismisses it. */
export function showUndoToast(label: string, durationMs: number, onUndo: () => void): string {
  return toast.custom(
    <UndoToast message={`${label} حذف شد`} durationMs={durationMs} onUndo={onUndo} />,
    { position: 'bottom-center', duration: Infinity }
  )
}

export function dismissUndoToast(id: string): void {
  toast.dismiss(id)
}
