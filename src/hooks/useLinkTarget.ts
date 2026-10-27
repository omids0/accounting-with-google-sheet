import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import type { LinkTargetItem } from '../services/linkPayment'
import { getSettings, isConfigured } from '../services/settings'
import {
  CHECKS_SHEET,
  DANG_SHEET,
  INSTALLMENTS_SHEET,
  RECEIVABLES_SHEET
} from '../services/sheetNames'
import { getSheetRowsView } from '../services/spreadsheetStore'
import {
  childOption,
  itemOption,
  matchesRecordAmount,
  pickError,
  type LinkTargetChildOption,
  type LinkTargetOption
} from '../utils/linkTargetFit'
import {
  linkTargetKindFor,
  type LinkTargetKind,
  type LinkTargetKindId
} from '../utils/linkTargetKinds'
import { parseNumeric } from '../utils/parseNumeric'
import { roundMoney } from '../utils/roundMoney'
import { shareInFlight } from '../utils/shareInFlight'
import { showError, showSuccess } from '../utils/toast'

export type { LinkTargetChildOption, LinkTargetOption }

/**
 * Which kinds had nothing open when their list was last read (per workbook). The next card of that
 * kind shows the «nothing open» hint from its first frame, so it does not grow when the read ends.
 */
const lastEmpty = new Map<string, boolean>()

/** The tab each kind lists from. A tab the local copy holds with no rows at all has nothing open. */
const KIND_TAB: Record<LinkTargetKindId, string> = {
  dang: DANG_SHEET,
  receivable: RECEIVABLES_SHEET,
  checkPaid: CHECKS_SHEET,
  checkReceived: CHECKS_SHEET,
  installment: INSTALLMENTS_SHEET
}

const mirrorTabIsEmpty = (spreadsheetId: string, kindId: LinkTargetKindId): boolean => {
  const rows = getSheetRowsView(spreadsheetId, KIND_TAB[kindId])

  return rows !== null && rows.length <= 1
}

/**
 * Bumped after any link is written: every picker on the page reads its list again, so a card does
 * not offer the debt (or check, instalment) another card has just completed.
 */
let linksVersion = 0

const linkListeners = new Set<() => void>()

const subscribeLinks = (listener: () => void) => {
  linkListeners.add(listener)

  return () => void linkListeners.delete(listener)
}

const bumpLinks = () => {
  linksVersion += 1
  linkListeners.forEach(listener => listener())
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
  const version = ownVersion + useSyncExternalStore(subscribeLinks, () => linksVersion)

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

  /** The pick no longer fits (the amount was raised or changed): saving waits for a new answer. */
  const error = kind ? pickError(kind, selected) : ''

  // A save before the open items are read would quietly take «هیچ‌کدوم»: it waits for the list.
  const blocker = error || (kind && loading ? 'یک لحظه صبر کن؛ فهرست هنوز خوانده نشده است.' : '')

  const select = useCallback((id: string) => {
    setSelectedId(id)
    setChildPick('')
  }, [])

  const reset = useCallback(() => {
    setSelectedId('')
    setChildPick('')
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
    [kind, selectedId, childId]
  )

  return {
    kind,
    options,
    loading,
    /** Still reading, and the last read of this kind found nothing open: reserve the hint's room. */
    expectEmpty,
    selectedId,
    select,
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
