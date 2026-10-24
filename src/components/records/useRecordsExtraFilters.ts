import { useCallback, useMemo, useState } from 'react'

import {
  ALL_COUNTERPARTIES,
  ALL_WALLET_ACCOUNTS,
  distinctCounterparties,
  matchesAmountRangeFilter,
  matchesCounterpartyFilter,
  matchesWalletAccountFilter,
  matchesWithItemsFilter,
  orderedRange
} from './recordsFilterPredicates'
import type { StoredRecord } from './recordsUtils'
import { useRecordsWalletOptions } from './useRecordsWalletOptions'
import { useMineFilter } from '../../hooks/useMineFilter'
import {
  buildAmountRangeChip,
  buildCounterpartyChip,
  buildWalletAccountChip,
  buildWithItemsChip
} from '../../utils/filterChips'

type Amount = number | ''

/**
 * «طرف حساب», «حساب», «مبلغ از/تا» and «با اقلام» filters of the records page, each with a
 * draft for the filter modal.
 */
export function useRecordsExtraFilters(records: StoredRecord[], initialCounterparty?: string) {
  const [counterparty, setCounterparty] = useState(initialCounterparty || ALL_COUNTERPARTIES)
  const [withItemsOnly, setWithItemsOnly] = useState(false)
  const [walletAccount, setWalletAccount] = useState(ALL_WALLET_ACCOUNTS)
  const [minAmount, setMinAmount] = useState<Amount>('')
  const [maxAmount, setMaxAmount] = useState<Amount>('')
  const [draftCounterparty, setDraftCounterparty] = useState(ALL_COUNTERPARTIES)
  const [draftWithItems, setDraftWithItems] = useState(false)
  const [draftWalletAccount, setDraftWalletAccount] = useState(ALL_WALLET_ACCOUNTS)
  const [draftMin, setDraftMin] = useState<Amount>('')
  const [draftMax, setDraftMax] = useState<Amount>('')
  const mine = useMineFilter(getRecordWriter)
  const { matches: matchesMine, chip: mineChip } = mine
  const { startDraft: startMine, applyDraft: applyMine, clearDraft: clearMineDraft } = mine
  const clearMine = mine.clearAll
  const wallet = useRecordsWalletOptions(records)
  const { titleOf } = wallet

  const options = useMemo(() => {
    const names = distinctCounterparties(records)

    // A filter that arrived by link must stay selectable even when the loaded form has no such record.
    return counterparty !== ALL_COUNTERPARTIES && !names.includes(counterparty)
      ? [...names, counterparty]
      : names
  }, [records, counterparty])

  const matches = useCallback(
    (record: StoredRecord) =>
      matchesCounterpartyFilter(record, counterparty) &&
      matchesWithItemsFilter(record, withItemsOnly) &&
      matchesWalletAccountFilter(record, walletAccount) &&
      matchesAmountRangeFilter(record, minAmount, maxAmount) &&
      matchesMine(record),
    [counterparty, withItemsOnly, walletAccount, minAmount, maxAmount, matchesMine]
  )

  const hasAmountRange = minAmount !== '' || maxAmount !== ''

  const chips = useMemo(
    () => [
      counterparty !== ALL_COUNTERPARTIES &&
        buildCounterpartyChip(counterparty, () => setCounterparty(ALL_COUNTERPARTIES)),
      // No chip until the account title is known: never a wrong «حساب حذف‌شده».
      walletAccount !== ALL_WALLET_ACCOUNTS &&
        titleOf(walletAccount) !== undefined &&
        buildWalletAccountChip(titleOf(walletAccount) ?? '', () =>
          setWalletAccount(ALL_WALLET_ACCOUNTS)
        ),
      hasAmountRange &&
        buildAmountRangeChip(minAmount, maxAmount, () => {
          setMinAmount('')
          setMaxAmount('')
        }),
      withItemsOnly && buildWithItemsChip(() => setWithItemsOnly(false)),
      mineChip
    ],
    [
      counterparty,
      walletAccount,
      titleOf,
      hasAmountRange,
      minAmount,
      maxAmount,
      withItemsOnly,
      mineChip
    ]
  )

  const startDraft = useCallback(() => {
    setDraftCounterparty(counterparty)
    setDraftWithItems(withItemsOnly)
    setDraftWalletAccount(walletAccount)
    setDraftMin(minAmount)
    setDraftMax(maxAmount)
    startMine()
  }, [counterparty, withItemsOnly, walletAccount, minAmount, maxAmount, startMine])

  const applyDraft = useCallback(() => {
    const [min, max] = orderedRange(draftMin, draftMax)

    setCounterparty(draftCounterparty)
    setWithItemsOnly(draftWithItems)
    setWalletAccount(draftWalletAccount)
    setMinAmount(min)
    setMaxAmount(max)
    applyMine()
  }, [draftCounterparty, draftWithItems, draftWalletAccount, draftMin, draftMax, applyMine])

  const clearDraft = useCallback(() => {
    setDraftCounterparty(ALL_COUNTERPARTIES)
    setDraftWithItems(false)
    setDraftWalletAccount(ALL_WALLET_ACCOUNTS)
    setDraftMin('')
    setDraftMax('')
    clearMineDraft()
  }, [clearMineDraft])

  const clearAll = useCallback(() => {
    setCounterparty(ALL_COUNTERPARTIES)
    setWithItemsOnly(false)
    setWalletAccount(ALL_WALLET_ACCOUNTS)
    setMinAmount('')
    setMaxAmount('')
    clearMine()
  }, [clearMine])

  return {
    options,
    /** The picker only appears once some record names a counterparty. */
    showCounterparty: options.length > 0,
    /** Likewise for «حساب»: once some record names a wallet account. */
    showWallet: wallet.options.length > 1,
    walletOptions: wallet.options,
    active:
      counterparty !== ALL_COUNTERPARTIES ||
      withItemsOnly ||
      walletAccount !== ALL_WALLET_ACCOUNTS ||
      hasAmountRange ||
      mine.active,
    minePanelProps: mine.panelProps,
    matches,
    chips,
    draftCounterparty,
    setDraftCounterparty,
    draftWithItems,
    setDraftWithItems,
    draftWalletAccount,
    setDraftWalletAccount,
    draftMin,
    setDraftMin,
    draftMax,
    setDraftMax,
    startDraft,
    applyDraft,
    clearDraft,
    clearAll
  }
}

function getRecordWriter(record: StoredRecord): string | undefined {
  return record.writer
}
