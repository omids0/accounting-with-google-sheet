import { useMemo, useState } from 'react'

import FormModal from './FormModal'
import { useCopyToClipboard } from '../hooks/useCopyToClipboard'
import {
  dismissFailedWrite,
  formatFailedWriteDetails,
  getFailedWriteSummaries,
  retryAllFailedWrites,
  retryFailedWrite,
  type FailedWriteSummary
} from '../services/failedWrites'
import { retryPendingWrites } from '../services/sheetSync'
import { useConflictStore } from '../stores/conflictStore'
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
  conflicts = 0
}: SyncDetailsModalProps) {
  const { copy } = useCopyToClipboard()

  const [version, setVersion] = useState(0)

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

  const retryAll = () => {
    if (!spreadsheetId) return
    if (items.length) retryAllFailedWrites(spreadsheetId)
    else void retryPendingWrites(spreadsheetId)
    onClose()
  }

  return (
    <FormModal
      open={open}
      title="وضعیت ذخیره در شیت"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        retryAll()
      }}
      saveLabel={items.length ? 'تلاش دوباره برای همه' : 'دوباره بفرست'}
    >
      <div>
        {cause && <Alert variant="error">{cause}</Alert>}
        {conflicts > 0 && (
          <div className={syncDetailsActionsClass}>
            <p className={confirmDeleteMessageClass}>
              {`${conflicts.toLocaleString(
                'fa-IR'
              )} تعارض: یک رکورد را تو و نفر دیگری هم‌زمان عوض کرده‌اید.`}
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
        {pendingWrites > 0 && (
          <p className={confirmDeleteMessageClass}>
            {pendingWrites} تغییر هنوز در صف ارسال به شیت است.
          </p>
        )}
        {items.length > 0 && (
          <>
            <p className={confirmDeleteMessageClass}>
              این تغییرها به شیت نرسید، معمولاً چون همان رکورد روی دستگاه دیگری حذف یا عوض شده بود.
              داده‌های شیت دست نخورده‌اند.
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
      </div>
    </FormModal>
  )
}
