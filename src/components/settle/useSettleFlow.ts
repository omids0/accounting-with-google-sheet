import { useCallback, useRef, useState } from 'react'

import type { SettleOptions, UnlinkChoice } from '../../services/settleOptions'

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
}

type Resolver<T> = (answer: T | null) => void

/**
 * Promise-style questions of settling: `askSettle` opens the settle sheet and resolves with the
 * answers (null when closed); `askUnlink` asks «رکورد وصل‌شده هم حذف شود؟» when unpaying.
 */
export function useSettleFlow() {
  const [settle, setSettle] = useState<{
    request: SettleRequest
    resolve: Resolver<SettleOptions>
  }>()
  const [unlink, setUnlink] = useState<Resolver<UnlinkChoice>>()
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

  return { askSettle, askUnlink, settle, unlink, answerSettle, answerUnlink }
}

export type SettleFlow = ReturnType<typeof useSettleFlow>
