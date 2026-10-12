import FormModal from '../FormModal'
import type { SheetSwitchGuardModalProps } from './useSheetSwitchGuard'
import Button from '../ui/Button'
import { confirmDeleteMessageClass } from '../ui/featureCardStyles'
import { syncDetailsCauseClass } from '../ui/syncDetailsStyles'

export default function SheetSwitchConfirmModal({
  open,
  count,
  flushing,
  onClose,
  onSyncFirst,
  onSwitchAnyway
}: SheetSwitchGuardModalProps) {
  return (
    <FormModal
      open={open}
      title="تغییرهای ارسال‌نشده"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        onSyncFirst()
      }}
      saving={flushing}
      saveLabel="اول همگام کن"
    >
      <div>
        <p className={confirmDeleteMessageClass}>
          {count} تغییر هنوز به شیت فعلی نرسیده؛ اول همگام شود یا جابه‌جا شویم؟
        </p>
        <p className={syncDetailsCauseClass}>
          اگر بدون همگام‌سازی جابه‌جا شوید، این تغییرها در صف می‌مانند و دفعهٔ بعد که همین شیت را
          باز کنید ارسال می‌شوند.
        </p>
        <div className="mt-3">
          <Button type="button" variant="secondary" disabled={flushing} onClick={onSwitchAnyway}>
            بدون همگام‌سازی جابه‌جا شو
          </Button>
        </div>
      </div>
    </FormModal>
  )
}
