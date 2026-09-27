import { useState } from 'react'

import type { DangSplitPersonWithRow } from './types'
import { setDangSplitPersonPaid } from '../../services/dangSplitPeople'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import { requireSpreadsheetId } from '../../utils/authGuard'
import { showError } from '../../utils/toast'

/** ویرایش درجای مبلغ پرداخت‌شده هر فرد در تب جمع‌بندی */
export function useDangSplitPaidEdit({
  people,
  summary,
  onSaved
}: {
  people: DangSplitPersonWithRow[]
  summary: DangSplitGroupSummary
  onSaved: () => Promise<void> | void
}) {
  const [edits, setEdits] = useState<Record<string, number | ''>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const paidValue = (personId: string): number | '' => {
    if (personId in edits) return edits[personId]

    return people.find(item => item.id === personId)?.paidAmount ?? 0
  }

  const handleChange = (personId: string, value: number | '') => {
    setEdits(current => ({ ...current, [personId]: value }))
  }

  const handleBlur = async (personId: string) => {
    const spreadsheetId = requireSpreadsheetId()
    const person = people.find(item => item.id === personId)

    if (!spreadsheetId || !person) return

    const next = edits[personId]

    if (next === undefined) return

    const paid = next === '' ? 0 : Number(next)

    if (!Number.isFinite(paid) || paid === person.paidAmount) {
      setEdits(current => {
        const rest = { ...current }

        delete rest[personId]

        return rest
      })

      return
    }

    const share = summary.people.find(item => item.personId === personId)?.share ?? 0

    setSavingId(personId)
    try {
      await setDangSplitPersonPaid(spreadsheetId, person, paid, share)
      setEdits(current => {
        const rest = { ...current }

        delete rest[personId]

        return rest
      })
      await onSaved()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'ثبت پرداخت ناموفق بود')
    } finally {
      setSavingId(null)
    }
  }

  return { paidValue, savingId, handleChange, handleBlur }
}
