import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  autoFillShares,
  sharesProblem,
  sharesSum,
  type LinkShares,
  type SharesProblem
} from '../utils/linkShares'
import type { LinkTargetOption } from '../utils/linkTargetFit'
import { roundMoney } from '../utils/roundMoney'

type LinkSharesOptions = {
  options: LinkTargetOption[]
  /** The record's amount the shares must add up to (0 while it is blank). */
  recordAmount: number
  /** False for a kind that links one item only: nothing is kept. */
  active: boolean
  /** The shares start over when this changes (the category moved to another kind). */
  resetKey: string | null
}

/** One item of the record's payment: its id and title, and the part of the record that pays it. */
export type LinkPick = { id: string; title: string; amount: number }

/**
 * The picks of a «بدهی»/«طلب» record that pays several items: which are ticked and what each takes.
 * A newly ticked item takes what is still unplaced (up to what is left on it); a new record amount
 * spreads again, oldest first. The user edits any share afterwards.
 */
export function useLinkShares({ options, recordAmount, active, resetKey }: LinkSharesOptions) {
  const [raw, setRaw] = useState<LinkShares>({})
  const targets = useMemo(
    () => options.map(option => ({ id: option.id, remaining: option.remaining })),
    [options]
  )

  // True once the user wrote a share by hand: an amount change then leaves the shares as they are.
  const edited = useRef(false)

  useEffect(() => {
    edited.current = false
    setRaw({})
  }, [resetKey])

  // An item completed elsewhere meanwhile is no longer in the list: its share goes with it.
  const shares = useMemo<LinkShares>(() => {
    const ids = new Set(targets.map(target => target.id))

    return Object.fromEntries(Object.entries(raw).filter(([id]) => ids.has(id)))
  }, [raw, targets])

  const lastAmount = useRef(recordAmount)

  const rawRef = useRef(raw)

  rawRef.current = raw

  useEffect(() => {
    if (lastAmount.current === recordAmount) return
    lastAmount.current = recordAmount

    const picked = Object.keys(rawRef.current)

    // Shares nobody wrote spread again; hand-written ones stay and the sum is checked as ever.
    if (!picked.length || edited.current) return
    setRaw(autoFillShares(targets, picked, recordAmount))
  }, [recordAmount, targets])

  const toggle = useCallback(
    (id: string) =>
      setRaw(current => {
        if (id in current) {
          const rest = Object.entries(current).filter(([key]) => key !== id)

          if (!rest.length) edited.current = false

          return Object.fromEntries(rest)
        }

        const remaining = targets.find(target => target.id === id)?.remaining ?? 0
        const unplaced = roundMoney(recordAmount - sharesSum(current))

        return { ...current, [id]: Math.max(0, Math.min(remaining, unplaced)) }
      }),
    [targets, recordAmount]
  )

  const setShare = useCallback((id: string, amount: number) => {
    edited.current = true
    setRaw(current => ({ ...current, [id]: roundMoney(amount) }))
  }, [])

  const reset = useCallback(() => {
    edited.current = false
    setRaw({})
  }, [])

  const picks = useMemo<LinkPick[]>(
    () =>
      options
        .filter(option => option.id in shares)
        .map(option => ({ id: option.id, title: option.title, amount: shares[option.id] })),
    [options, shares]
  )

  const problem: SharesProblem | null =
    active && recordAmount > 0 ? sharesProblem(targets, shares, recordAmount) : null

  return {
    shares,
    picks,
    /** The picked shares add up to this. */
    placed: sharesSum(shares),
    problem,
    toggle,
    setShare,
    reset
  }
}

export type LinkSharesState = ReturnType<typeof useLinkShares>
