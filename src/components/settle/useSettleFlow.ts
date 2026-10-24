import { useCallback, useRef, useState } from 'react'

import type { SettleOptions, UnlinkChoice } from '../../services/settleOptions'
import { showInfo } from '../../utils/toast'

/** One payment waiting for the settle sheet. */
export interface SettleRequest {
  type: 'expense' | 'income'
  /** Sheet title: «تسویهٔ «x» · y». */
  title: string
  amount: number
  /** `transactionRecordId` of every item of the module (they are settlements already). */
  linkedIds: readonly string[]
  /** Starting payment date; today when unset. */
  date?: string
  /** A line under the title that says what saving does (a building repays a debt as a transfer). */
  note?: string
  /** The debt was bridged to the manager's personal spreadsheet: the sheet also asks for the account there. */
  bridge?: boolean
}

type Resolver<T> = (answer: T | null) => void

/** The sentence of the «برگرداندن پرداخت» question; says what happens to the linked record. */
export function unpayMessage(hasLinkedRecord: boolean): string {
  return hasLinkedRecord
    ? 'پرداخت این مورد برگردانده می‌شود و رکورد مالی مرتبط حذف می‌شود.'
    : 'پرداخت این مورد برگردانده می‌شود.'
}

/**
 * Promise-style questions of settling: `askSettle` opens the settle sheet and resolves with the
 * answers (null when closed); `askUnpay` confirms taking a payment back; `askUnlink` asks
 * «رکورد وصل‌شده هم حذف شود؟» when the linked record was the user's own.
 */
export function useSettleFlow() {
  const [settle, setSettle] = useState<{
    request: SettleRequest
    resolve: Resolver<SettleOptions>
  }>()
  const [unlink, setUnlink] = useState<Resolver<UnlinkChoice>>()
  const [unpay, setUnpay] = useState<{ message: string; resolve: (ok: boolean) => void }>()
  /** One question at a time: a second ask while one is open answers null at once. */
  const open = useRef(false)

  const askSettle = useCallback((request: SettleRequest) => {
    if (open.current) return Promise.resolve(null)
    open.current = true

    return new Promise<SettleOptions | null>(resolve => setSettle({ request, resolve }))
  }, [])

  const askUnlink = useCallback(() => {
    if (open.current) return Promise.resolve(null)
    open.current = true

    return new Promise<UnlinkChoice | null>(resolve => setUnlink(() => resolve))
  }, [])

  const askUnpay = useCallback((hasLinkedRecord: boolean) => {
    if (open.current) {
      // The checkbox is controlled, so it springs back; say why nothing else happened.
      showInfo('اول به پرسش بازِ پیش‌رو پاسخ بده')

      return Promise.resolve(false)
    }
    open.current = true

    return new Promise<boolean>(resolve =>
      setUnpay({ message: unpayMessage(hasLinkedRecord), resolve })
    )
  }, [])

  const answerSettle = (options: SettleOptions | null) => {
    open.current = false
    settle?.resolve(options)
    setSettle(undefined)
  }

  const answerUnlink = (choice: UnlinkChoice | null) => {
    open.current = false
    unlink?.(choice)
    setUnlink(undefined)
  }

  const answerUnpay = (ok: boolean) => {
    open.current = false
    unpay?.resolve(ok)
    setUnpay(undefined)
  }

  return {
    askSettle,
    askUnlink,
    askUnpay,
    settle,
    unlink,
    unpay,
    answerSettle,
    answerUnlink,
    answerUnpay
  }
}

export type SettleFlow = ReturnType<typeof useSettleFlow>
