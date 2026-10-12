import RestoreBackupModal from './RestoreBackupModal'
import { useBackupRestore } from './useBackupRestore'
import { useBackupDownload } from '../../../hooks/useBackupDownload'
import { useBackupState } from '../../../hooks/useBackupState'
import { setBackupReminderOn } from '../../../services/backupReminder'
import { formatBackupDate } from '../../../services/backupSummary'
import {
  backupCardActionsClass,
  backupCardMetaClass,
  backupCardTextClass,
  backupLinkButtonClass
} from '../../ui/backupStyles'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

/** Settings → «حساب و داده» → «پشتیبان کامل»: download every tab as one zip, or restore one. */
export default function SettingsBackupCard({ spreadsheetId }: { spreadsheetId: string }) {
  const backup = useBackupDownload()
  const restore = useBackupRestore()
  const state = useBackupState(spreadsheetId)
  const reminderOn = !state.reminderOff

  return (
    <Card>
      <CardTitle>پشتیبان کامل</CardTitle>
      <p className={backupCardTextClass}>
        همه بخش‌ها (تراکنش‌ها، حساب‌ها، چک‌ها، اقساط، …) در یک فایل. برای جابه‌جایی به گوشی جدید یا
        خیال راحت.
      </p>
      <div className={backupCardActionsClass}>
        <Button
          type="button"
          variant="primary"
          loading={backup.busy}
          disabled={backup.busy}
          onClick={() => void backup.download()}
        >
          <span>
            دانلود پشتیبان کامل (<bdi>.zip</bdi>)
          </span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={restore.loading}
          disabled={restore.loading}
          onClick={() => void restore.start()}
        >
          بازیابی از پشتیبان…
        </Button>
      </div>
      <p className={backupCardMetaClass}>
        آخرین پشتیبان:{' '}
        {state.lastBackupAt ? formatBackupDate(state.lastBackupAt) : 'هنوز گرفته نشده'}
        <br />
        یادآوری ماهانه:{' '}
        <button
          type="button"
          className={backupLinkButtonClass}
          aria-pressed={reminderOn}
          title="روشن یا خاموش کردن یادآوری ماهانه پشتیبان"
          onClick={() => setBackupReminderOn(spreadsheetId, !reminderOn)}
        >
          {reminderOn ? 'روشن' : 'خاموش'}
        </button>
      </p>
      <RestoreBackupModal {...restore.modal} />
    </Card>
  )
}
