import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'

import { dismissUndoToast, showUndoToast } from '../components/UndoToast'
import { handleSheetError } from '../utils/sheetError'

export const UNDO_WINDOW_MS = 5000

export interface UndoableDelete {
  /** Id of the row; the list hides it while the delete waits. */
  id: string
  /** What was deleted, e.g. «چک ۱۲۳۴۵۶»; the toast reads «… حذف شد». */
  label: string
  /** The real delete (sheet write). Runs only once the undo window closes. */
  commit: () => Promise<void>
  /** Extra list updates beyond hiding the row by id. */
  optimisticRemove?: () => void
  /** Undoes `optimisticRemove`; also runs when `commit` fails. */
  restore?: () => void
  errorMessage?: string
}

type Pending = UndoableDelete & { timer: ReturnType<typeof setTimeout>; toastId: string }

/**
 * Delete now, write later: the row disappears at once and a toast offers
 * «بازگردانی» for five seconds. The sheet is touched only when the window
 * closes, or earlier when the user leaves (route change, app hidden, unload)
 * or deletes another row of the same list.
 */
export function useUndoableDelete() {
  const pendingRef = useRef<Pending | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const { pathname } = useLocation()

  const flush = useCallback(async () => {
    const pending = pendingRef.current

    if (!pending) return

    pendingRef.current = null
    clearTimeout(pending.timer)
    dismissUndoToast(pending.toastId)
    try {
      await pending.commit()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: pending.errorMessage ?? 'خطا در حذف' })
      pending.restore?.()
    } finally {
      // Stay hidden until the commit's reload has dropped the row, so it never flickers back.
      setPendingId(current => (current === pending.id ? null : current))
    }
  }, [])

  const undo = useCallback(() => {
    const pending = pendingRef.current

    if (!pending) return

    pendingRef.current = null
    clearTimeout(pending.timer)
    dismissUndoToast(pending.toastId)
    setPendingId(null)
    pending.restore?.()
  }, [])

  const schedule = useCallback(
    async (entry: UndoableDelete) => {
      // One pending delete per list: a second delete writes the first one now.
      await flush()
      entry.optimisticRemove?.()
      pendingRef.current = {
        ...entry,
        timer: setTimeout(() => void flush(), UNDO_WINDOW_MS),
        toastId: showUndoToast(entry.label, UNDO_WINDOW_MS, undo)
      }
      setPendingId(entry.id)
    },
    [flush, undo]
  )

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    const onLeave = () => void flush()

    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)

    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
      void flush()
    }
  }, [flush])

  // Leaving the screen writes the pending delete, even when the page stays mounted.
  const firstPathRef = useRef(pathname)

  useEffect(() => {
    if (pathname !== firstPathRef.current) {
      firstPathRef.current = pathname
      void flush()
    }
  }, [pathname, flush])

  /** The list without the row that is waiting to be deleted. */
  const visible = useCallback(
    <T extends { id: string }>(items: T[]): T[] =>
      pendingId ? items.filter(item => item.id !== pendingId) : items,
    [pendingId]
  )

  return { schedule, undo, flush, pendingId, visible }
}
