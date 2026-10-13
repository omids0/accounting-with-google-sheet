import { useEffect, useState, type FormEvent } from 'react'

import { netWorthMonthTitle } from './netWorthLabels'
import { saveManualNetWorth } from '../../services/netWorthSheet'
import type { NetWorthPoint } from '../../services/netWorthTrend'
import { getSettings } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import { formHintClass } from '../ui/formStyles'

/** Corrects one month of «دارایی ماهانه»; the row becomes «دستی» and nothing overwrites it. */
export default function NetWorthEditModal({
  point,
  onClose
}: {
  /** Open while set. */
  point: NetWorthPoint | null
  onClose: () => void
}) {
  const [netWorth, setNetWorth] = useState<number | ''>('')
  const [liabilities, setLiabilities] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!point) return
    setNetWorth(point.netWorth)
    setLiabilities(point.liabilities)
  }, [point])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!point || !spreadsheetId || !requireAuth()) return

    setSaving(true)
    try {
      await saveManualNetWorth(spreadsheetId, point.monthKey, {
        netWorth: Number(netWorth) || 0,
        liabilities: Number(liabilities) || 0
      })
      showSuccess('دارایی ماه ذخیره شد')
      onClose()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره دارایی ماه' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      open={point != null}
      title={`دارایی پایان ${point ? netWorthMonthTitle(point.monthKey) : ''}`}
      onClose={() => !saving && onClose()}
      onSubmit={event => void handleSubmit(event)}
      saving={saving}
      saveLabel="ذخیره"
    >
      <FormField label="دارایی خالص" required>
        <AmountInput value={netWorth} onChange={setNetWorth} />
      </FormField>
      <FormField label="بدهی‌های منتخب">
        <AmountInput value={liabilities} onChange={setLiabilities} />
      </FormField>
      <p className={formHintClass}>
        مقدار این ماه در برگه «دارایی ماهانه» با منبع «دستی» ذخیره می‌شود و ثبت خودکار آن را عوض
        نمی‌کند.
      </p>
    </FormModal>
  )
}
