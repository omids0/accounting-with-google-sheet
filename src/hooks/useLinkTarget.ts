import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import {
  bumpLinks,
  getLinksVersion,
  lastEmpty,
  mirrorTabIsEmpty,
  subscribeLinks
} from './linkTargetShared'
import { useLinkShares } from './useLinkShares'
import type { LinkTargetItem } from '../services/linkPayment'
import { getSettings, isConfigured } from '../services/settings'
import {
  childOption,
  itemOption,
  matchesRecordAmount,
  pickError,
  sharesProblemMessage,
  type LinkTargetChildOption,
  type LinkTargetOption
} from '../utils/linkTargetFit'
import { linkTargetKindFor, type LinkTargetKind } from '../utils/linkTargetKinds'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { shareInFlight } from '../utils/shareInFlight'
import { showError, showSuccess } from '../utils/toast'

export type { LinkTargetChildOption, LinkTargetOption }

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
 * «بدهی», «طلب», «چک» and «قسط» records can pay an open debt, receivable, check or installment.
 * This is the one hook the manual entry form and the bank-SMS card both mount: which items are
 * open, which one is picked (and, for an installment book, which of its instalments) and the
 * payment written after the record exists. The pick lives here, never in the form's values (those
 * become sheet columns and the draft).
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
  const [fetching, setFetching] = useState(false)
  // The kind whose list was read: until then the picker is «loading», also in its very first frame.
  const [loadedKind, setLoadedKind] = useState<string | null>(null)
  const spreadsheetKey = getSettings()?.spreadsheetId ?? ''
  const loading =
    Boolean(kindId && spreadsheetKey && isConfigured()) && (fetching || loadedKind !== kindId)
  // Known before the read: the last read of this kind found nothing, or its tab has no rows at all.
  const expectEmpty =
    loading &&
    kindId !== null &&
    (lastEmpty.get(`${spreadsheetKey}:${kindId}`) === true ||
      mirrorTabIsEmpty(spreadsheetKey, kindId))
  const [selectedId, setSelectedId] = useState('')
  const [childPick, setChildPick] = useState('')

  // Bumped after a save: the list is read again, so a payment just added shows its new remaining.
  const [ownVersion, setVersion] = useState(0)
  const version = ownVersion + useSyncExternalStore(subscribeLinks, getLinksVersion)

  useEffect(() => {
    setSelectedId('')
    setChildPick('')
    setItems([])
  }, [kindId])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!kindId || !spreadsheetId || !isConfigured()) return

    let cancelled = false

    setFetching(true)
    // The services load only when the category asks for them; several cards share one read.
    void import('../services/linkPayment')
      .then(({ listOpenLinkTargets }) =>
        shareInFlight(`linkTargets:${kindId}:${spreadsheetId}`, () =>
          listOpenLinkTargets(kindId, spreadsheetId)
        )
      )
      .then(list => {
        lastEmpty.set(`${spreadsheetId}:${kindId}`, list.length === 0)
        if (cancelled) return
        setItems(list)
        setLoadedKind(kindId)
      })
      // A list that cannot be read is the same as nothing to link: the record saves as usual.
      .catch(() => {
        if (cancelled) return
        setItems([])
        setLoadedKind(kindId)
      })
      .finally(() => !cancelled && setFetching(false))

    return () => {
      cancelled = true
    }
  }, [kindId, version])

  const recordAmount = roundMoney(Math.abs(parseNumeric(String(amount ?? ''))))

  const options = useMemo<LinkTargetOption[]>(() => {
    const wanted = subCategory.trim()
    const exact = kind?.fit === 'exact'

    const ranked = items.map((item, index) => ({
      item,
      index,
      sameAmount: exact && matchesRecordAmount(item, recordAmount),
      first: wanted !== '' && item.category.trim() === wanted
    }))

    // A check of the record's own amount first, then the items filed under the chosen
    // subcategory; the rest keep their order.
    ranked.sort(
      (a, b) =>
        Number(b.sameAmount) - Number(a.sameAmount) ||
        Number(b.first) - Number(a.first) ||
        a.index - b.index
    )

    return kind ? ranked.map(({ item }) => itemOption(kind, item, recordAmount)) : []
  }, [items, kind, subCategory, recordAmount])

  const selected = options.find(option => option.id === selectedId)

  // The instalments of the picked book; the next unpaid one is preselected until the user picks.
  const childOptions = useMemo<LinkTargetChildOption[]>(
    () => (selected?.children ?? []).map(child => childOption(child, recordAmount)),
    [selected, recordAmount]
  )

  const childId = childOptions.some(child => child.id === childPick)
    ? childPick
    : childOptions[0]?.id ?? ''

  const selectedChild = childOptions.find(child => child.id === childId)

  // A record that may pay several items keeps its picks as shares; the others pick one item.
  const multi = Boolean(kind?.multi)
  const shareState = useLinkShares({ options, recordAmount, active: multi, resetKey: kindId })
  const { reset: resetShares, picks: sharePicks } = shareState
  const hasPick = multi ? sharePicks.length > 0 : Boolean(selectedId)

  /** The pick no longer fits (the amount was raised or changed): saving waits for a new answer. */
  const error = multi
    ? sharesProblemMessage(shareState.problem, options)
    : kind
    ? pickError(kind, selected)
    : ''

  // A save before the open items are read would quietly take «هیچ‌کدوم»: it waits for the list.
  const blocker = error || (kind && loading ? 'یک لحظه صبر کن؛ فهرست هنوز خوانده نشده است.' : '')

  const select = useCallback((id: string) => {
    setSelectedId(id)
    setChildPick('')
  }, [])

  const reset = useCallback(() => {
    setSelectedId('')
    setChildPick('')
    resetShares()
    setVersion(current => current + 1)
  }, [resetShares])

  /**
   * Adds the saved record to the picked item as its payment (the record is the payment: no second
   * record, no second balance move). Does nothing without a pick. Never throws: when the payment
   * cannot be written the record stays and the user is told where to link it by hand (never to
   * save again, which would write the record twice). True when a payment was added.
   */
  const attach = useCallback(
    async (record: LinkRecordInput): Promise<boolean> => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!kind || !hasPick || !spreadsheetId) return false

      if (kind.multi) {
        const { attachRecordToTargets, multiLinkFailureMessage } = await import(
          '../services/linkPaymentMulti'
        )

        const result = await attachRecordToTargets(kind.id, spreadsheetId, record, sharePicks)

        if (result.done.length) bumpLinks()
        if (result.failed.length) showError(multiLinkFailureMessage(kind, result))
        else showSuccess(kind.multi.successMessage(result.done.length))

        return result.done.length > 0
      }

      const payments = await import('../services/linkPayment')

      try {
        const title = await payments.attachRecordToTarget(
          kind.id,
          spreadsheetId,
          selectedId,
          record,
          childId
        )

        showSuccess(kind.successMessage(title))
        bumpLinks()

        return true
      } catch (err) {
        showError(payments.linkFailureMessage(kind, err))

        return false
      }
    },
    [kind, hasPick, selectedId, childId, sharePicks]
  )

  return {
    kind,
    options,
    loading,
    /** Still reading, and the last read of this kind found nothing open: reserve the hint's room. */
    expectEmpty,
    selectedId,
    select,
    /** The record's amount the shares must add up to (0 while blank). */
    recordAmount,
    /** A pick was made: an item, or at least one share of a record that pays several. */
    hasPick,
    /** The ticked items and their shares (kinds that pay several items only). */
    shares: shareState,
    /** The instalments of the picked item (empty for kinds without a second level). */
    childOptions,
    childId,
    selectChild: setChildPick,
    /** Visible under the second select when the instalment's amount is not the record's. */
    warning: selectedChild?.warning ?? '',
    error,
    /** Why the record cannot be saved yet: the pick no longer fits, or the list is still loading. */
    blocker,
    reset,
    attach
  }
}

export type LinkTargetState = ReturnType<typeof useLinkTarget>
