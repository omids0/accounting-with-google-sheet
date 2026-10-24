import { useMemo, useState } from 'react'

import ConfirmActionModal from './ConfirmActionModal'
import FormModal from './FormModal'
import { describeRetryOutcome } from './syncDetailsText'
import SyncStatusSummary from './SyncStatusSummary'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import {
  dismissAllFailedWrites,
  dismissFailedWrite,
  formatFailedWriteDetails,
  getFailedWriteSummaries,
  retryAllAndWait,
  retryFailedWrite,
  type FailedWriteSummary
} from '../services/failedWrites'
import { buildSyncReport } from '../services/syncReport'
import { useConflictStore } from '../stores/conflictStore'
import { showError, showInfo, showSuccess } from '../utils/toast'
import Alert from './ui/Alert'
import Button from './ui/Button'
import { confirmDeleteMessageClass, listCardTitleClass } from './ui/featureCardStyles'
import {
  syncDetailsActionsClass,
  syncDetailsCauseClass,
  syncDetailsFailedTagClass,
  syncDetailsFieldsClass,
  syncDetailsItemClass,
  syncDetailsItemHeaderClass,
  syncDetailsListClass
} from './ui/syncDetailsStyles'

type SyncDetailsModalProps = {
  open: boolean
  onClose: () => void
  spreadsheetId: string | null
  cause: string | null
  pendingWrites: number
  /** Changes when the parked list changes, so the list is read again. */
  failedWrites: number
  /** Edits waiting for «کدام بماند؟»; the button reopens that sheet. */
  conflicts?: number
  lastSyncedAt?: number | null
  offline?: boolean
}

function FailedWriteItem({
  item,
  onRetry,
  onCopy,
  onDismiss
}: {
  item: FailedWriteSummary
  onRetry: () => void
  onCopy: () => void
  onDismiss: () => void
}) {
  const fields = [item.title, item.amount, item.date].filter(Boolean).join(' · ')

  return (
    <li className={syncDetailsItemClass}>
      <div className={syncDetailsItemHeaderClass}>
        <span className={listCardTitleClass}>
          {item.action} در «{item.sheetName}»
        </span>
        <span className={syncDetailsFailedTagClass}>ثبت نشد</span>
      </div>
      {fields && <p className={syncDetailsFieldsClass}>{fields}</p>}
      <p className={syncDetailsCauseClass}>
        {item.cause}
        {item.reverted && ' این تغییر در اپ هم برگردانده شد.'}
      </p>
      <p className={syncDetailsCauseClass}>
        تعداد تلاش: {Math.max(item.attempts, 1).toLocaleString('fa-IR')}
      </p>
      <div className={syncDetailsActionsClass}>
        <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
          تلاش دوباره
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCopy}>
          کپی جزئیات
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={onDismiss}>
          حذف
        </Button>
      </div>
    </li>
  )
}

export default function SyncDetailsModal({
  open,
  onClose,
  spreadsheetId,
  cause,
  pendingWrites,
  failedWrites,
  conflicts = 0,
  lastSyncedAt = null,
  offline = false
}: SyncDetailsModalProps) {
  const { copy } = useCopyToClipboard()

  const [version, setVersion] = useState(0)

  const [sending, setSending] = useState(false)

  const [confirmingDismissAll, setConfirmingDismissAll] = useState(false)

  const items = useMemo(
    () => (open && spreadsheetId ? getFailedWriteSummaries(spreadsheetId) : []),
    // `version` and `failedWrites` only signal that the stored list changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, spreadsheetId, failedWrites, version]
  )

  const act = (action: (id: string) => void) => {
    if (!spreadsheetId) return
    action(spreadsheetId)
    setVersion(value => value + 1)
  }

  const resend = async () => {
    if (!spreadsheetId || sending) return
    setSending(true)
    try {
      const toast = describeRetryOutcome(await retryAllAndWait(spreadsheetId), offline)

      if (toast.kind === 'success') showSuccess(toast.message)
      else if (toast.kind === 'error') showError(toast.message)
      else showInfo(toast.message)
    } finally {
      setSending(false)
      setVersion(value => value + 1)
    }
  }

  const dismissAll = () => {
    act(dismissAllFailedWrites)
    setConfirmingDismissAll(false)
    showInfo('عملیات ناموفق حذف شد؛ اپ نسخهٔ شیت را نگه می‌دارد.')
  }

  return (
    <>
      <FormModal
        open={open}
        title="وضعیت ذخیره در شیت"
        onClose={onClose}
        onSubmit={event => {
          event.preventDefault()
          void resend()
        }}
        saving={sending}
        saveLabel="دوباره بفرست"
        cancelLabel="بستن"
      >
        <div>
          {cause && <Alert variant="error">{cause}</Alert>}
          <SyncStatusSummary
            pendingWrites={pendingWrites}
            failedWrites={items.length}
            conflicts={conflicts}
            lastSyncedAt={lastSyncedAt}
            offline={offline}
          />
          {conflicts > 0 && (
            <div className={syncDetailsActionsClass}>
              <p className={confirmDeleteMessageClass}>
                یک رکورد را تو و نفر دیگری هم‌زمان عوض کرده‌اید.
              </p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  useConflictStore.getState().reopen()
                  onClose()
                }}
              >
                انتخاب نسخه
              </Button>
            </div>
          )}
          {items.length > 0 && (
            <>
              <p className={confirmDeleteMessageClass}>
                این تغییرها به شیت نرسید، معمولاً چون همان رکورد روی دستگاه دیگری حذف یا عوض شده
                بود. داده‌های شیت دست نخورده‌اند.
              </p>
              <ul className={syncDetailsListClass}>
                {items.map(item => (
                  <FailedWriteItem
                    key={item.id}
                    item={item}
                    onRetry={() => act(id => retryFailedWrite(id, item.id))}
                    onCopy={() => void copy(formatFailedWriteDetails(item), 'جزئیات کپی شد')}
                    onDismiss={() => act(id => dismissFailedWrite(id, item.id))}
                  />
                ))}
              </ul>
            </>
          )}
          <p className={confirmDeleteMessageClass}>
            اگر همگام‌سازی گیر کرد یا خطا داد، گزارش را کپی کنید و بفرستید.
          </p>
          <div className={syncDetailsActionsClass}>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void copy(buildSyncReport(spreadsheetId), 'گزارش همگام‌سازی کپی شد')}
            >
              کپی گزارش همگام‌سازی
            </Button>
            {items.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setConfirmingDismissAll(true)}
              >
                حذف عملیات ناموفق
              </Button>
            )}
          </div>
        </div>
      </FormModal>
      <ConfirmActionModal
        open={confirmingDismissAll}
        title="حذف عملیات ناموفق"
        message={`${items.length.toLocaleString(
          'fa-IR'
        )} عملیات که به شیت نرسید از صف کنار گذاشته می‌شود و دیگر فرستاده نمی‌شود. داده‌های شیت دست نمی‌خورد و اپ نسخهٔ شیت را نشان می‌دهد. ادامه بدهیم؟`}
        confirmLabel="حذف کن"
        cancelLabel="انصراف"
        onClose={() => setConfirmingDismissAll(false)}
        onConfirm={dismissAll}
      />
    </>
  )
}
