import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'

import BackupVersionsList from './BackupVersionsList'
import RestoreBackupModal from './RestoreBackupModal'
import { useBackupRestore } from './useBackupRestore'
import { useDriveBackups } from './useDriveBackups'
import { SETTINGS_PATH } from '../../../routes/paths'
import type { DriveBackupFile } from '../../../services/autoBackupPlan'
import {
  setAutoBackupOn,
  setBackupReminderOn,
  setOverdueNoticeOn
} from '../../../services/backupReminder'
import { formatBackupDateTime } from '../../../services/backupSummary'
import { downloadDriveBackup } from '../../../services/driveBackups'
import { getSettings } from '../../../services/settings'
import { useAppStore } from '../../../stores/appStore'
import ConfirmDeleteModal from '../../ConfirmDeleteModal'
import {
  backupPageActionsClass,
  backupPageClass,
  backupStatusDateClass,
  backupStatusFolderClass,
  backupStatusLabelClass
} from '../../ui/backupStyles'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import DisplaySwitchRow from '../display/DisplaySwitchRow'

/** `/settings/backup` — «پشتیبان» (round 7, Task I), for the active spreadsheet. */
export default function BackupPage() {
  const spreadsheetKey = useAppStore(state => state.spreadsheetKey)
  // `spreadsheetKey` is bumped on every switch; settings themselves are not reactive.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spreadsheetId = useMemo(() => getSettings()?.spreadsheetId ?? '', [spreadsheetKey])

  if (!spreadsheetId) return <Navigate to={SETTINGS_PATH} replace />

  return <BackupPageContent key={spreadsheetId} spreadsheetId={spreadsheetId} />
}

function BackupPageContent({ spreadsheetId }: { spreadsheetId: string }) {
  const drive = useDriveBackups(spreadsheetId)
  const restore = useBackupRestore()
  const [confirmFile, setConfirmFile] = useState<DriveBackupFile | null>(null)
  const { state } = drive

  const restoreFrom = (file: DriveBackupFile) =>
    void restore.startFrom(async () => (await downloadDriveBackup(file.id)).arrayBuffer())

  // Automatic ones are replaced week by week anyway; a manual one asks first.
  const askDelete = (file: DriveBackupFile) =>
    file.kind === 'manual' ? setConfirmFile(file) : void drive.remove(file)

  return (
    <div className={backupPageClass}>
      <Card>
        <p className={backupStatusLabelClass}>آخرین پشتیبان (دستی یا خودکار)</p>
        <p className={backupStatusDateClass}>
          {state.lastBackupAt ? formatBackupDateTime(state.lastBackupAt) : 'هنوز گرفته نشده'}
        </p>
        <p className={backupStatusLabelClass}>آخرین پشتیبان خودکار هفتگی</p>
        <p className={backupStatusDateClass}>
          {state.lastAutoBackupAt
            ? formatBackupDateTime(state.lastAutoBackupAt)
            : 'هنوز خودکار گرفته نشده'}
        </p>
        {state.lastAutoBackupAt && state.driveFolderLabel ? (
          <p className={backupStatusFolderClass}>
            ✓ در <bdi>{state.driveFolderLabel}</bdi>
          </p>
        ) : null}
      </Card>

      <Card>
        <DisplaySwitchRow
          title="پشتیبان خودکار هفتگی"
          hint="زیپ کامل، سه نسخهٔ آخر نگه داشته می‌شود"
          checked={!state.autoOff}
          onChange={on => setAutoBackupOn(spreadsheetId, on)}
        />
        <DisplaySwitchRow
          title="اگر دو هفته پشتیبان نشد، خبر بده"
          hint="یک اعلان در هر دو هفته و یک خط در جمع‌بندی شبانه"
          checked={!state.overdueNoticeOff}
          onChange={on => setOverdueNoticeOn(spreadsheetId, on)}
        />
        <DisplaySwitchRow
          title="یادآوری ماهانه روی داشبورد"
          hint="کارت «پشتیبان بگیر» وقتی یک ماه پشتیبانی گرفته نشده"
          checked={!state.reminderOff}
          onChange={on => setBackupReminderOn(spreadsheetId, on)}
        />
        <BackupVersionsList
          files={drive.files}
          loadError={drive.loadError}
          busy={drive.busy || restore.loading}
          onDownload={file => void drive.download(file)}
          onRestore={restoreFrom}
          onDelete={askDelete}
        />
      </Card>

      <div className={backupPageActionsClass}>
        <Button
          type="button"
          variant="primary"
          loading={drive.busy}
          disabled={drive.busy}
          onClick={() => void drive.backupNow()}
        >
          پشتیبان الان
        </Button>
        <Button
          type="button"
          variant="secondary"
          loading={restore.loading}
          disabled={restore.loading}
          onClick={() => void restore.start()}
        >
          بازگردانی از فایل…
        </Button>
      </div>

      <RestoreBackupModal {...restore.modal} />
      <ConfirmDeleteModal
        open={confirmFile !== null}
        title="حذف نسخهٔ دستی"
        message={`«${
          confirmFile?.name ?? ''
        }» از Drive حذف شود؟ نسخه‌های دستی هیچ‌وقت خودکار پاک نمی‌شوند.`}
        deleting={drive.busy}
        onClose={() => setConfirmFile(null)}
        onConfirm={() => {
          const file = confirmFile

          setConfirmFile(null)
          if (file) void drive.remove(file)
        }}
      />
    </div>
  )
}
