import { useState } from 'react'

import { guardDangAmount } from './amountFloor'
import type { DangWithRow } from './types'
import { sortDangs, updateDang } from '../../services/dang'
import { withDangPaidState } from '../../services/dangRow'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showError } from '../../utils/toast'
import { useReadOnly } from '../ui/readOnly'

/**
 * The inline amount edit of a debt card (typed field, or the dial pad in a building). A new
 * amount below what was already paid is refused with a message before anything is written.
 */
export function useDangAmountEdit(setItems: React.Dispatch<React.SetStateAction<DangWithRow[]>>) {
  const [savingAmountId, setSavingAmountId] = useState('')
  const [amountEdits, setAmountEdits] = useState<Record<string, number | ''>>({})
  const readOnly = useReadOnly()

  const handleAmountChange = (item: DangWithRow, value: number | '') => {
    setAmountEdits(prev => ({ ...prev, [item.id]: value }))
  }

  const handleAmountBlur = async (item: DangWithRow, value?: number | '') => {
    if (readOnly) return

    // The dial pad passes the amount it just confirmed; the typed field leaves it in `amountEdits`.
    const pending = value !== undefined ? value : amountEdits[item.id]

    if (pending === undefined) return

    setAmountEdits(prev => {
      const next = { ...prev }

      delete next[item.id]

      return next
    })

    const amount = Number(pending)

    if (!amount || amount <= 0) {
      showError('مبلغ باید بیشتر از صفر باشد')

      return
    }
    if (amount === item.amount) return
    if (!guardDangAmount(item, amount)) return

    const spreadsheetId = requireSpreadsheetId()

    if (!spreadsheetId) return

    setSavingAmountId(item.id)
    try {
      // A raised amount re-opens a settled debt, so the paid columns are recomputed too.
      const updated = withDangPaidState({ ...item, amount })

      await updateDang(spreadsheetId, item.rowNumber, updated)
      setItems(prev =>
        sortDangs(prev.map(d => (d.id === item.id ? { ...updated, rowNumber: item.rowNumber } : d)))
      )
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در به‌روزرسانی مبلغ' })
    } finally {
      setSavingAmountId('')
    }
  }

  return { savingAmountId, amountEdits, handleAmountChange, handleAmountBlur }
}
