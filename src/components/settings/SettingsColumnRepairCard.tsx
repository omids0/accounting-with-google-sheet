import { useState } from 'react'

import {
  findLegacyRows,
  legacyRepairBlocker,
  repairLegacyRows,
  type LegacyRowFix
} from '../../services/legacyRowRepair'
import { getSettings } from '../../services/settings'
import { formatPersianNumber } from '../../utils/formatMoney'
import { showError, showInfo, showSuccess } from '../../utils/toast'
import ConfirmActionModal from '../ConfirmActionModal'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { formHintClass } from '../ui/formStyles'

/**
 * Settings → «حساب و داده» → «ترمیم ستون‌ها»: rows an older version wrote in a different column
 * order are scanned in the local copy and, only after the user confirms, rewritten in today's order.
 */
export default function SettingsColumnRepairCard({ spreadsheetId }: { spreadsheetId: string }) {
  const [found, setFound] = useState<LegacyRowFix[] | null>(null)
  const [repairing, setRepairing] = useState(false)

  const scan = () => {
    const blocker = legacyRepairBlocker(spreadsheetId)

    if (blocker) {
      showError(blocker)

      return
    }

    const fixes = findLegacyRows(spreadsheetId, getSettings()?.forms ?? [])

    if (!fixes.length) {
      showInfo('همهٔ ردیف‌های درآمد و هزینه در ستون درست هستند.')

      return
    }
    setFound(fixes)
  }

  const confirm = async () => {
    if (!found) return
    setRepairing(true)
    try {
      // Scan again: the list shown may be older than the data (a sync can have fixed rows meanwhile).
      const count = await repairLegacyRows(
        spreadsheetId,
        findLegacyRows(spreadsheetId, getSettings()?.forms ?? [])
      )

      showSuccess(`${formatPersianNumber(count)} ردیف به ستون درست منتقل شد.`)
      setFound(null)
    } catch {
      showError('ترمیم ستون‌ها انجام نشد؛ دوباره امتحان کن.')
    } finally {
      setRepairing(false)
    }
  }

  return (
    <Card>
      <CardTitle>ترمیم ستون‌ها</CardTitle>
      <p className={formHintClass}>
        اگر در درآمد یا هزینه رکوردهای قدیمی مبلغ صفر یا دسته‌بندی عددی نشان می‌دهند، اینجا ردیف‌های
        قدیمی پیدا و بعد از تأیید تو به ستون درست منتقل می‌شوند. شناسه و زمان ثبت همان می‌ماند.
      </p>
      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={scan}>
        بررسی ردیف‌ها
      </Button>
      <ConfirmActionModal
        open={found !== null}
        title="ترمیم ستون‌ها"
        message={`${formatPersianNumber(
          found?.length ?? 0
        )} ردیف با چیدمان ستون قدیمی پیدا شد. مبلغ و دسته‌بندی آن‌ها در شیت جابه‌جا می‌شود و بقیهٔ ردیف‌ها دست نمی‌خورد. ادامه بدهیم؟`}
        confirmLabel="ترمیم کن"
        cancelLabel="انصراف"
        confirming={repairing}
        onClose={() => setFound(null)}
        onConfirm={confirm}
      />
    </Card>
  )
}
