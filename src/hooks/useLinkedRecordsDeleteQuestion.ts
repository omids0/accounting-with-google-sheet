import { useCallback, useRef, useState } from 'react'

import {
  linkedRecordsMessage,
  shouldAskLinkedRecords,
  type LinkedRecordsAnswer
} from '../utils/linkedRecordsDelete'

/**
 * «رکوردهای مالی هم پاک شوند؟» before a receivable, plan, debt or check with payments goes into
 * its undo window. `ask` resolves with the answer, or null when the sheet was closed (the delete
 * is called off). Items without records get no question and the answer «delete» (nothing to keep).
 * The safe answer (keep) is the main button: deleting records is what moves past months.
 */
export function useLinkedRecordsDeleteQuestion() {
  const [asked, setAsked] = useState({ count: 0, name: '' })
  const resolver = useRef<((answer: LinkedRecordsAnswer | null) => void) | null>(null)

  const ask = useCallback((linkedCount: number, itemName?: string) => {
    if (!shouldAskLinkedRecords(linkedCount)) {
      return Promise.resolve<LinkedRecordsAnswer>('delete')
    }

    resolver.current?.(null)

    return new Promise<LinkedRecordsAnswer | null>(resolve => {
      resolver.current = resolve
      setAsked({ count: linkedCount, name: itemName ?? '' })
    })
  }, [])

  const answer = (value: LinkedRecordsAnswer | null) => {
    resolver.current?.(value)
    resolver.current = null
    setAsked({ count: 0, name: '' })
  }

  return {
    ask,
    /** Spread into `ConfirmActionModal`. */
    modalProps: {
      open: asked.count > 0,
      title: 'رکوردهای مالی هم پاک شوند؟',
      message: linkedRecordsMessage(asked.count, asked.name || undefined),
      confirmLabel: 'نه، رکوردها بمانند',
      cancelLabel: 'بله، پاک شوند',
      onConfirm: () => answer('keep'),
      onCancel: () => answer('delete'),
      onClose: () => answer(null)
    }
  }
}
