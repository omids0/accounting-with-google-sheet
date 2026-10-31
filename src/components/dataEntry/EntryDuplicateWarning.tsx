import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useDataRefresh } from '../../hooks/useDataRefresh'
import { recordFocusPath } from '../../routes/paths'
import { getDateFieldId } from '../../services/dashboardAggregation'
import {
  createdAgoLabel,
  findRecentEntryDuplicate,
  type LedgerEntry
} from '../../services/recordDuplicates'
import { loadRecordLedger } from '../../services/recordLedger'
import { getSettings } from '../../services/settings'
import type { CustomForm } from '../../types'
import { parseNumeric } from '../../utils/parseNumeric'
import { normalizeSheetDate } from '../../utils/sheetValues'
import { alertClassName } from '../ui/Alert'
import Button from '../ui/Button'
import { entryDuplicateActionsClass, entryDuplicateLinkClass } from '../ui/entryAssistStyles'

/**
 * «احتمالاً تکراری»: same amount, category and date as a record created in the last
 * 60 minutes. Shown under the amount; never blocks saving. «بستن هشدار»
 * dismisses it for this form (per matched record).
 */
export default function EntryDuplicateWarning({
  form,
  values
}: {
  form: CustomForm
  values: Record<string, string | number>
}) {
  const navigate = useNavigate()
  const revision = useDataRefresh()
  const [ledger, setLedger] = useState<LedgerEntry[]>([])
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())
  const type = form.type === 'income' || form.type === 'expense' ? form.type : null

  useEffect(() => {
    const settings = getSettings()

    if (!type || !settings?.spreadsheetId) return

    let live = true

    void loadRecordLedger(settings, type)
      .then(entries => live && setLedger(entries))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [type, revision])

  const amount = parseNumeric(values.amount)
  const category = String(values.category ?? '')
  const date = normalizeSheetDate(values[getDateFieldId(form)] ?? '')
  const now = Date.now()
  const match = useMemo(
    () =>
      type ? findRecentEntryDuplicate({ type, amount, category, date }, ledger, Date.now()) : null,
    [type, amount, category, date, ledger]
  )

  if (!type || !match?.id || dismissed.has(match.id)) return null

  const matchId = match.id

  return (
    <div className={alertClassName('warning', 'xl:col-span-2')} role="status">
      <b>احتمالاً تکراری</b>
      {` — همین مبلغ در همین دسته ${createdAgoLabel(match.createdAtMs ?? now, now)} ثبت شده`}
      <div className={entryDuplicateActionsClass}>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => navigate(recordFocusPath(type, matchId))}
        >
          دیدن آن رکورد
        </Button>
        <button
          type="button"
          className={entryDuplicateLinkClass}
          onClick={() => setDismissed(current => new Set(current).add(matchId))}
        >
          بستن هشدار
        </button>
      </div>
    </div>
  )
}
