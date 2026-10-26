import { useCallback, useEffect, useMemo, useState } from 'react'

import type { LinkTargetItem } from '../services/linkPayment'
import { getSettings, isConfigured } from '../services/settings'
import { formatMoney } from '../utils/formatMoney'
import { linkTargetKindFor, type LinkTargetKind } from '../utils/linkTargetKinds'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { shareInFlight } from '../utils/shareInFlight'
import { showError, showSuccess } from '../utils/toast'

export type LinkTargetOption = LinkTargetItem & {
  /** The record's amount is more than what is left: the item cannot take this payment. */
  disabled: boolean
}

type LinkTargetOptions = {
  /** The record being entered. */
  type: string
  category: string
  subCategory?: string
  amount: string | number
  /** False while the surface cannot link (a duplicate warning, a building offer, …). */
  enabled?: boolean
}

/** The record the form or card has just written: its id, amount and date. */
export type LinkRecordInput = { recordId: string; amount: number; date: string }

/**
 * «بدهی» (expense) and «طلب» (income) records can pay an open debt or receivable. This is the one
 * hook the manual entry form and the bank-SMS card both mount: which items are open, which one is
 * picked and the payment written after the record exists. The pick lives here, never in the
 * form's values (those become sheet columns and the draft).
 */
export function useLinkTarget({
  type,
  category,
  subCategory = '',
  amount,
  enabled = true
}: LinkTargetOptions) {
  const kind: LinkTargetKind | null = enabled ? linkTargetKindFor(type, category) : null
  const kindId = kind?.id ?? null
  const [items, setItems] = useState<LinkTargetItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  // Bumped after a save: the list is read again, so a payment just added shows its new remaining.
  const [version, setVersion] = useState(0)

  useEffect(() => {
    setSelectedId('')
    setItems([])
  }, [kindId])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!kindId || !spreadsheetId || !isConfigured()) return

    let cancelled = false

    setLoading(true)
    // The services load only when the category asks for them; several cards share one read.
    void import('../services/linkPayment')
      .then(({ listOpenLinkTargets }) =>
        shareInFlight(`linkTargets:${kindId}:${spreadsheetId}`, () =>
          listOpenLinkTargets(kindId, spreadsheetId)
        )
      )
      .then(list => !cancelled && setItems(list))
      // A list that cannot be read is the same as nothing to link: the record saves as usual.
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [kindId, version])

  const recordAmount = roundMoney(Math.abs(parseNumeric(String(amount ?? ''))))

  const options = useMemo<LinkTargetOption[]>(() => {
    const wanted = subCategory.trim()
    const ranked = items.map((item, index) => ({
      item,
      index,
      first: wanted !== '' && item.category.trim() === wanted
    }))

    // The items filed under the chosen subcategory come first; the rest keep their order.
    ranked.sort((a, b) => Number(b.first) - Number(a.first) || a.index - b.index)

    return ranked.map(({ item }) => ({
      ...item,
      disabled: recordAmount > 0 && item.remaining < recordAmount
    }))
  }, [items, subCategory, recordAmount])

  const selected = options.find(option => option.id === selectedId)

  /** The pick no longer fits (the amount was raised): saving waits for a new answer. */
  const error =
    selected?.disabled && kind
      ? `مبلغ رکورد نمی‌تواند بیشتر از مانده (${formatMoney(selected.remaining)}) باشد`
      : ''

  const reset = useCallback(() => {
    setSelectedId('')
    setVersion(current => current + 1)
  }, [])

  /**
   * Adds the saved record to the picked item as its payment (the record is the payment: no second
   * record, no second balance move). Does nothing without a pick. Never throws: when the payment
   * cannot be written the record stays and the user is told where to link it by hand (never to
   * save again, which would write the record twice). True when a payment was added.
   */
  const attach = useCallback(
    async (record: LinkRecordInput): Promise<boolean> => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!kind || !selectedId || !spreadsheetId) return false

      const payments = await import('../services/linkPayment')

      try {
        const title = await payments.attachRecordToTarget(
          kind.id,
          spreadsheetId,
          selectedId,
          record
        )

        showSuccess(`پرداخت به «${title}» وصل شد`)
        setVersion(current => current + 1)

        return true
      } catch (err) {
        showError(payments.linkFailureMessage(kind, err))

        return false
      }
    },
    [kind, selectedId]
  )

  return {
    kind,
    options,
    loading,
    selectedId,
    select: setSelectedId,
    error,
    reset,
    attach
  }
}

export type LinkTargetState = ReturnType<typeof useLinkTarget>
