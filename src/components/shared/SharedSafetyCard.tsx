import { useBackupState } from '../../hooks/useBackupState'
import { setAutoBackupOn } from '../../services/backupReminder'
import DisplaySwitchRow from '../settings/display/DisplaySwitchRow'
import Card from '../ui/Card'
import { sharedCardTitleClass, sharedMutedClass } from '../ui/sharedStyles'

interface SharedSafetyCardProps {
  spreadsheetId: string
  /** «شما» or the owner's name: whose Drive holds the file. */
  owner: string
  /** `export`: the automatic backup switch. */
  canExport: boolean
  /** For the owner: who can edit the file in Drive, from the sharing info already loaded. */
  editors?: string[]
}

/**
 * «ایمنی داده» on the members tab: the file lives in the owner's Drive, so a backup copy in each
 * member's own Drive. It is the app's weekly automatic backup (`driveBackupRun`), which needs no
 * more than a file opened through the Picker (it reads through Sheets and uploads a new zip); its
 * «پشتیبان» folder falls back to the member's own My Drive when the owner's folder is not writable.
 */
export default function SharedSafetyCard({
  spreadsheetId,
  owner,
  canExport,
  editors
}: SharedSafetyCardProps) {
  const state = useBackupState(spreadsheetId)

  return (
    <Card>
      <h3 className={sharedCardTitleClass}>ایمنی داده</h3>
      <p className={`${sharedMutedClass} mt-1`}>
        {`فایل در درایو ${owner} است. اگر مالک فایل را پاک کند، همه دسترسی را از دست می‌دهند.`}
      </p>
      {editors?.length ? (
        <p className={sharedMutedClass}>{`ویرایش در درایو: ${editors.join('، ')}`}</p>
      ) : null}
      {canExport ? (
        <DisplaySwitchRow
          title="پشتیبان خودکار هفتگی در درایو شما"
          hint="زیپ کامل در پوشهٔ «پشتیبان» درایو خودتان؛ سه نسخهٔ آخر می‌ماند"
          checked={!state.autoOff}
          onChange={on => setAutoBackupOn(spreadsheetId, on)}
        />
      ) : null}
    </Card>
  )
}
