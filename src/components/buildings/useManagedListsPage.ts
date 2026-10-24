import { useEffect, useState } from 'react'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import {
  addManagedItem,
  getManagedList,
  moveManagedItem,
  saveManagedList,
  setManagedItemHidden,
  updateManagedItem,
  type ManagedItem,
  type ManagedListId
} from '../../services/buildingLists'
import { loadListUsage, type ListUsage } from '../../services/buildingListUsage'
import { can } from '../../services/buildingRoles'
import { getSettings } from '../../services/settings'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'

type Patch = Parameters<typeof updateManagedItem>[2]

const DUPLICATE = 'نام خالی یا تکراری است'

/**
 * «فهرست‌ها» (screen 30): one managed list at a time (kinds or payers), its usage counts and
 * the four edits. Each edit is shown at once and written as the whole list; a failed write puts
 * the old list back. A value is never deleted: hiding keeps it on the records that use it.
 */
export function useManagedListsPage() {
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const revision = useDataRefresh()
  const [listId, setListId] = useState<ManagedListId>('EXPENSE_KINDS')
  const [items, setItems] = useState<ManagedItem[]>(() => getManagedList(listId, spreadsheetId))
  const [usage, setUsage] = useState<ListUsage>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!busy) setItems(getManagedList(listId, spreadsheetId))
  }, [listId, spreadsheetId, revision, busy])

  useEffect(() => {
    let live = true

    setUsage({})
    void loadListUsage(spreadsheetId, listId)
      .then(counts => live && setUsage(counts))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [listId, spreadsheetId, revision])

  /** Writes `next`; false when nothing changed, it was refused or the write failed. */
  const apply = async (next: ManagedItem[], refusal?: string): Promise<boolean> => {
    if (!can('settings', spreadsheetId)) {
      showError('تغییر فهرست‌ها فقط با دسترسی «تنظیمات» ممکن است')

      return false
    }

    if (next === items) {
      if (refusal) showError(refusal)

      return false
    }

    const previous = items

    setItems(next)
    setBusy(true)
    try {
      await saveManagedList(spreadsheetId, listId, next)

      return true
    } catch (err) {
      setItems(previous)
      showError(toUserMessage(err, 'ذخیرهٔ فهرست ناموفق بود'))

      return false
    } finally {
      setBusy(false)
    }
  }

  return {
    listId,
    setListId,
    items,
    usage,
    busy,
    add: (label: string, chargeTo: ManagedItem['chargeTo']) =>
      apply(
        addManagedItem(items, label, listId === 'EXPENSE_KINDS' ? { chargeTo } : {}),
        DUPLICATE
      ),
    update: (value: string, patch: Patch) =>
      apply(updateManagedItem(items, value, patch), DUPLICATE),
    setHidden: (value: string, hidden: boolean) =>
      apply(setManagedItemHidden(items, value, hidden), 'حداقل یک مورد باید نمایان بماند'),
    move: (from: number, to: number) => apply(moveManagedItem(items, from, to))
  }
}
