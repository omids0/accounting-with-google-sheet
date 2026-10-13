import { useBackupDownload } from '../../hooks/useBackupDownload'
import { useBackupState } from '../../hooks/useBackupState'
import { backupReminderDue, snoozeBackupReminder } from '../../services/backupReminder'
import { countRecordRows } from '../../services/onboarding'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { discoveryRowCloseClass } from '../ui/dashboardCalmStyles'
import {
  guideCardClass,
  guideCardHintClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/** «N روز از آخرین پشتیبان گذشته»: the last guide card, after 30 days without a full backup. */
export default function DashboardBackupCard({ spreadsheetId }: { spreadsheetId: string }) {
  const state = useBackupState(spreadsheetId)
  const backup = useBackupDownload()
  const due = backupReminderDue(state, (countRecordRows(spreadsheetId) ?? 0) > 0)

  if (!due) return null

  const title =
    due.kind === 'since'
      ? `${due.days.toLocaleString('fa-IR')} روز از آخرین پشتیبان گذشته`
      : 'هنوز پشتیبان کامل نگرفته‌ای'

  return (
    <Card className={guideCardClass}>
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="export" size={20} />
      </span>
      <div className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{title}</span>
        <span className={guideCardHintClass}>یک دقیقه وقت می‌گیرد</span>
      </div>
      <Button
        type="button"
        size="sm"
        loading={backup.busy}
        disabled={backup.busy}
        onClick={() => void backup.download()}
      >
        بگیر
      </Button>
      <button
        type="button"
        className={discoveryRowCloseClass}
        onClick={() => snoozeBackupReminder(spreadsheetId)}
        aria-label="۳۰ روز دیگر یادآوری کن"
        title="۳۰ روز دیگر یادآوری کن"
      >
        <AppIcon name="close" size={16} />
      </button>
    </Card>
  )
}
