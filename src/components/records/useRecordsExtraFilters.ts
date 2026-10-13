import { useCallback, useMemo, useState } from 'react'

import {
  ALL_COUNTERPARTIES,
  distinctCounterparties,
  matchesCounterpartyFilter,
  matchesWithItemsFilter
} from './recordsFilterPredicates'
import type { StoredRecord } from './recordsUtils'
import { buildCounterpartyChip, buildWithItemsChip } from '../../utils/filterChips'

/** «طرف حساب» and «با اقلام» filters of the records page, each with a draft for the filter modal. */
export function useRecordsExtraFilters(records: StoredRecord[], initialCounterparty?: string) {
  const [counterparty, setCounterparty] = useState(initialCounterparty || ALL_COUNTERPARTIES)
  const [withItemsOnly, setWithItemsOnly] = useState(false)
  const [draftCounterparty, setDraftCounterparty] = useState(ALL_COUNTERPARTIES)
  const [draftWithItems, setDraftWithItems] = useState(false)

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
      matchesWithItemsFilter(record, withItemsOnly),
    [counterparty, withItemsOnly]
  )

  const chips = useMemo(
    () => [
      counterparty !== ALL_COUNTERPARTIES &&
        buildCounterpartyChip(counterparty, () => setCounterparty(ALL_COUNTERPARTIES)),
      withItemsOnly && buildWithItemsChip(() => setWithItemsOnly(false))
    ],
    [counterparty, withItemsOnly]
  )

  const startDraft = useCallback(() => {
    setDraftCounterparty(counterparty)
    setDraftWithItems(withItemsOnly)
  }, [counterparty, withItemsOnly])

  const applyDraft = useCallback(() => {
    setCounterparty(draftCounterparty)
    setWithItemsOnly(draftWithItems)
  }, [draftCounterparty, draftWithItems])

  const clearDraft = useCallback(() => {
    setDraftCounterparty(ALL_COUNTERPARTIES)
    setDraftWithItems(false)
  }, [])

  const clearAll = useCallback(() => {
    setCounterparty(ALL_COUNTERPARTIES)
    setWithItemsOnly(false)
  }, [])

  return {
    options,
    /** The picker only appears once some record names a counterparty. */
    showCounterparty: options.length > 0,
    active: counterparty !== ALL_COUNTERPARTIES || withItemsOnly,
    matches,
    chips,
    draftCounterparty,
    setDraftCounterparty,
    draftWithItems,
    setDraftWithItems,
    startDraft,
    applyDraft,
    clearDraft,
    clearAll
  }
}
