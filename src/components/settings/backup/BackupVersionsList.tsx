import { useState } from 'react'

import { formatBackupSize, type DriveBackupFile } from '../../../services/autoBackupPlan'
import { formatBackupDate } from '../../../services/backupSummary'
import { getJalaliParts } from '../../../utils/jalaliDate'
import BankSmsMoreSheet from '../../bankSms/BankSmsMoreSheet'
import {
  backupNoteClass,
  backupSectionTitleClass,
  backupVersionDayClass,
  backupVersionListClass,
  backupVersionMetaClass,
  backupVersionNameClass,
  backupVersionRowClass
} from '../../ui/backupStyles'
import Button from '../../ui/Button'
import { displaySettingsRowTextClass } from '../../ui/displaySettingsStyles'

const KIND_LABEL: Record<DriveBackupFile['kind'], string> = { auto: 'خودکار', manual: 'دستی' }

interface BackupVersionsListProps {
  files: DriveBackupFile[] | null
  loadError: string
  busy: boolean
  onDownload: (file: DriveBackupFile) => void
  onRestore: (file: DriveBackupFile) => void
  onDelete: (file: DriveBackupFile) => void
}

function versionMeta(file: DriveBackupFile): string {
  return [formatBackupSize(file.size), KIND_LABEL[file.kind], formatBackupDate(file.createdAt)]
    .filter(Boolean)
    .join('، ')
}

/** «نسخه‌ها»: this spreadsheet's zips in Drive, newest first; «⋯» → download / restore / delete. */
export default function BackupVersionsList({
  files,
  loadError,
  busy,
  onDownload,
  onRestore,
  onDelete
}: BackupVersionsListProps) {
  const [menuFile, setMenuFile] = useState<DriveBackupFile | null>(null)

  return (
    <>
      <h3 className={backupSectionTitleClass}>نسخه‌ها</h3>
      {files === null ? (
        <p className={backupNoteClass}>در حال خواندن از Drive…</p>
      ) : loadError ? (
        <p className={backupNoteClass}>{loadError}</p>
      ) : files.length === 0 ? (
        <p className={backupNoteClass}>هنوز نسخه‌ای در Drive نیست.</p>
      ) : (
        <ul className={backupVersionListClass}>
          {files.map(file => (
            <li key={file.id} className={backupVersionRowClass}>
              <span className={backupVersionDayClass} aria-hidden>
                {getJalaliParts(new Date(file.createdAt)).day.toLocaleString('fa-IR')}
              </span>
              <span className={displaySettingsRowTextClass}>
                <bdi className={backupVersionNameClass}>{file.name}</bdi>
                <span className={backupVersionMetaClass}>{versionMeta(file)}</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                aria-label={`گزینه‌های نسخهٔ ${file.name}`}
                onClick={() => setMenuFile(file)}
              >
                ⋯
              </Button>
            </li>
          ))}
        </ul>
      )}
      <BankSmsMoreSheet
        open={menuFile !== null}
        title={menuFile?.name ?? 'نسخه'}
        onClose={() => setMenuFile(null)}
        actions={
          menuFile
            ? [
                { id: 'download', label: 'دانلود', onSelect: () => onDownload(menuFile) },
                { id: 'restore', label: 'بازگردانی…', onSelect: () => onRestore(menuFile) },
                { id: 'delete', label: 'حذف از Drive', onSelect: () => onDelete(menuFile) }
              ]
            : []
        }
      />
    </>
  )
}
