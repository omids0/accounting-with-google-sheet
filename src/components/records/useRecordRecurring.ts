import { useCallback, useEffect, useState } from 'react'

import type { StoredRecord } from './recordsUtils'
import { getDateFieldId } from '../../services/dashboardAggregation'
import {
  findRecurringForRecord,
  isRecurringBorn,
  recurringFromRecord,
  type RecurringChoice
} from '../../services/recurring'
import {
  fetchRecurringItems,
  saveRecurringItem,
  stripRow,
  type SheetRecurringItem
} from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'
import { normalizeSheetDate } from '../../utils/sheetValues'

type Values = Record<string, string | number>

/**
 * «تکرار ماهانه» in the record edit form: the item the record belongs to (same type,
 * category, subcategory and account), the chosen mode, and the one-time amount question
 * for records the recurring card or auto mode posted.
 */
export function useRecordRecurring(record: StoredRecord | null, form: CustomForm | undefined) {
  const [item, setItem] = useState<SheetRecurringItem | null>(null)
  const [choice, setChoice] = useState<RecurringChoice>('none')
  const type = form?.type === 'income' || form?.type === 'expense' ? form.type : null

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    setItem(null)
    setChoice('none')
    if (!record || !type || !spreadsheetId) return

    let live = true

    void fetchRecurringItems(spreadsheetId).then(rows => {
      if (!live) return

      const found = findRecurringForRecord(rows, type, record.values)

      setItem(found)
      setChoice(found?.active ? found.mode : 'none')
    })

    return () => {
      live = false
    }
  }, [record, type])

  /** «از این به بعد هم همین مبلغ؟»: a recurring-born record whose amount now differs. */
  const asksAmount = useCallback(
    (values: Values): boolean => {
      if (!record || !item || !isRecurringBorn(record.values)) return false

      const next = parseNumeric(values.amount)

      return next > 0 && next !== parseNumeric(record.values.amount) && next !== item.amount
    },
    [record, item]
  )

  /** After the record is saved: create, update or switch off its item. */
  const apply = useCallback(
    async (values: Values, alsoAmount: boolean): Promise<void> => {
      const spreadsheetId = getSettings()?.spreadsheetId
      const initial: RecurringChoice = item?.active ? item.mode : 'none'

      if (!spreadsheetId || !type || !form || (choice === initial && !alsoAmount)) return

      if (!item) {
        if (choice === 'none') return

        const dateIso = normalizeSheetDate(values[getDateFieldId(form)] ?? '')

        await saveRecurringItem(
          spreadsheetId,
          recurringFromRecord(type, values, dateIso, choice, {
            id: crypto.randomUUID(),
            createdAt: new Date().toLocaleString('fa-IR')
          })
        )

        return
      }

      await saveRecurringItem(spreadsheetId, {
        ...stripRow(item),
        mode: choice === 'none' ? item.mode : choice,
        active: choice !== 'none',
        amount: alsoAmount ? parseNumeric(values.amount) : item.amount
      })
    },
    [item, choice, type, form]
  )

  return { enabled: !!type, choice, setChoice, asksAmount, apply }
}
