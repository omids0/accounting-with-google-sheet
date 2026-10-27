import { useState } from 'react'

import { useActiveSpreadsheetName } from '../../hooks/useActiveSpreadsheetName'
import {
  describeFix,
  legacyRepairBlocker,
  repairLegacyRows,
  scanLegacyRows,
  type LegacyScan
} from '../../services/legacyRowRepair'
import { getSettings } from '../../services/settings'
import { sharedCan, SHARED_NO_ACCESS_MESSAGE } from '../../services/sharedCan'
import { formatPersianNumber } from '../../utils/formatMoney'
import { showError, showInfo, showSuccess } from '../../utils/toast'
import ConfirmActionModal from '../ConfirmActionModal'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { formHintClass } from '../ui/formStyles'

const SAMPLE_ROWS = 3

const show = (value: string) => `«${value || 'خالی'}»`

/** The dialog text: counts, rows that need a manual look, and before/after of the first rows. */
function previewMessage({ fixes, review }: LegacyScan): string {
  const lines = [
    `${formatPersianNumber(
      fixes.length
    )} ردیف با چیدمان ستون قدیمی پیدا شد و بعد از تأیید جابه‌جا می‌شود. بقیهٔ ردیف‌ها دست نمی‌خورد.`
  ]

  for (const fix of fixes.slice(0, SAMPLE_ROWS).map(describeFix)) {
    lines.push(
      `ردیف ${formatPersianNumber(fix.rowNumber)} ${show(fix.title)}: الان دسته ${show(
        fix.before.category
      )} و مبلغ ${show(fix.before.amount)} ← بعد از ترمیم دسته ${show(
        fix.after.category
      )} و مبلغ ${show(fix.after.amount)}`
    )
  }
  if (review.length) {
    lines.push(
      `${formatPersianNumber(
        review.length
      )} ردیف مشکوک است (احتمال اشتباه یا ستونی که جایی ندارد) و ترمیم نمی‌شود؛ خودت در شیت نگاهشان کن.`
    )
  }
  lines.push('پیش از نوشتن، یک پشتیبان کامل گرفته می‌شود.')

  return lines.join('\n')
}

/**
 * Settings → «حساب و داده» → «ترمیم ستون‌ها»: rows an older version wrote in a different column
 * order are scanned in the local copy and, only after the user confirms (a backup is taken first),
 * rewritten in today's order.
 */
export default function SettingsColumnRepairCard({ spreadsheetId }: { spreadsheetId: string }) {
  const [found, setFound] = useState<LegacyScan | null>(null)
  const [repairing, setRepairing] = useState(false)
  const spreadsheetLabel = useActiveSpreadsheetName()

  const scan = () => {
    const blocker = legacyRepairBlocker(spreadsheetId)

    if (blocker) {
      showError(blocker)

      return
    }

    const result = scanLegacyRows(spreadsheetId, getSettings()?.forms ?? [])

    if (!result.fixes.length && !result.review.length) {
      showInfo('همهٔ ردیف‌های درآمد و هزینه در ستون درست هستند.')

      return
    }
    if (!result.fixes.length) {
      showInfo(
        `${formatPersianNumber(
          result.review.length
        )} ردیف مشکوک پیدا شد که خودکار ترمیم نمی‌شود؛ در شیت نگاهشان کن.`
      )

      return
    }
    setFound(result)
  }

  const confirm = async () => {
    if (!found) return
    // Refused before the backup: a shared account repairs only with «ویرایش ثبت‌های دیگران».
    if (!sharedCan('editOthers', spreadsheetId)) {
      showError(SHARED_NO_ACCESS_MESSAGE)

      return
    }
    setRepairing(true)
    try {
      const { createFullBackup } = await import('../../services/backupExport')

      if (!(await createFullBackup(spreadsheetId, spreadsheetLabel))) {
        showError('پشتیبان گرفته نشد، پس چیزی نوشته نشد.')

        return
      }

      // Scan again: the list shown may be older than the data (a sync can have fixed rows meanwhile).
      const result = await repairLegacyRows(
        spreadsheetId,
        scanLegacyRows(spreadsheetId, getSettings()?.forms ?? []).fixes
      )

      if (result.aborted) {
        showError('ردیف‌های شیت از زمان بررسی عوض شده؛ چیزی نوشته نشد. دوباره بررسی کن.')
      } else {
        showSuccess(
          `${formatPersianNumber(result.written)} ردیف به ستون درست منتقل شد${
            result.skipped
              ? `؛ ${formatPersianNumber(result.skipped)} ردیف که عوض شده بود دست نخورد`
              : ''
          }.`
        )
      }
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
        قدیمی پیدا و بعد از تأیید تو (و گرفتن پشتیبان) به ستون درست منتقل می‌شوند. شناسه و زمان ثبت
        همان می‌ماند.
      </p>
      <Button type="button" variant="secondary" size="sm" className="self-start" onClick={scan}>
        بررسی ردیف‌ها
      </Button>
      <ConfirmActionModal
        open={found !== null}
        title="ترمیم ستون‌ها"
        message={found ? previewMessage(found) : ''}
        confirmLabel="پشتیبان بگیر و ترمیم کن"
        cancelLabel="انصراف"
        confirming={repairing}
        onClose={() => setFound(null)}
        onConfirm={confirm}
      />
    </Card>
  )
}
