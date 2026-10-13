import { useNavigate } from 'react-router'

import { useBackupState } from '../../../hooks/useBackupState'
import { SETTINGS_BACKUP_PATH } from '../../../routes/paths'
import { lastSuccessfulBackup } from '../../../services/autoBackupPlan'
import { formatBackupDate } from '../../../services/backupSummary'
import { backupCardMetaClass, backupCardTextClass } from '../../ui/backupStyles'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

/** Settings → «حساب و داده» → «پشتیبان»: the summary; everything else is on `/settings/backup`. */
export default function SettingsBackupCard({ spreadsheetId }: { spreadsheetId: string }) {
  const navigate = useNavigate()
  const state = useBackupState(spreadsheetId)
  const last = lastSuccessfulBackup(state)

  return (
    <Card>
      <CardTitle>پشتیبان</CardTitle>
      <p className={backupCardTextClass}>
        همه بخش‌ها در یک فایل زیپ؛ هر هفته خودکار در Drive، یا هر وقت خواستی روی همین دستگاه.
        بازگردانی هم از همین‌جاست.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        onClick={() => navigate(SETTINGS_BACKUP_PATH)}
      >
        پشتیبان و بازگردانی
      </Button>
      <p className={backupCardMetaClass}>
        آخرین پشتیبان: {last ? formatBackupDate(last) : 'هنوز گرفته نشده'}
        {state.autoOff ? '؛ پشتیبان خودکار خاموش است' : ''}
      </p>
    </Card>
  )
}
