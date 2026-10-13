import CloseYearReconcileStep from './CloseYearReconcileStep'
import CloseYearStepRow from './CloseYearStepRow'
import type { CloseYearWizard } from './useCloseYear'
import { formatBackupDate } from '../../services/backupSummary'
import { MONTHLY_BALANCE_SHEET } from '../../services/sheetNames'
import { formatJalaliYear } from '../../utils/dateRange'
import { formatPersianNumber } from '../../utils/formatMoney'
import ProgressBar from '../ProgressBar'
import Button from '../ui/Button'
import { closeYearActionsClass, closeYearStepsClass } from '../ui/closeYearStyles'

/** «تب «الف» و «ب»» */
function tabList(titles: string[]): string {
  const quoted = titles.map(title => `«${title}»`)

  return quoted.length > 1
    ? `تب‌های ${quoted.slice(0, -1).join('، ')} و ${quoted[quoted.length - 1]}`
    : `تب ${quoted[0] ?? ''}`
}

function archiveHint(wizard: CloseYearWizard, year: number): string {
  const { archive, pendingArchiveRows, archivedTabs } = wizard

  if (!archive || pendingArchiveRows === null) return 'در حال شمردن رکوردها…'

  if (pendingArchiveRows > 0) {
    const tabs = archive.filter(tab => tab.rows > 0).map(tab => tab.title)

    return `${formatPersianNumber(pendingArchiveRows)} رکورد به ${tabList(
      tabs
    )} می‌رود؛ جستجو و گزارش‌ها هنوز می‌بینند`
  }

  return archivedTabs.length
    ? `در ${tabList(archivedTabs)}؛ جستجو و گزارش‌ها هنوز می‌بینند`
    : `رکوردی از ${formatJalaliYear(year)} در تب‌ها نمانده`
}

function ArchiveProgress({ wizard }: { wizard: CloseYearWizard }) {
  const { progress } = wizard

  if (wizard.busy !== 'archive' || !progress || !progress.total) return null

  return (
    <ProgressBar
      value={Math.round((progress.done / progress.total) * 100)}
      aria-label="پیشرفت آرشیو"
    />
  )
}

/** The four steps in order; each runs on its own, so any of them can be skipped. */
export default function CloseYearSteps({
  wizard,
  year
}: {
  wizard: CloseYearWizard
  year: number
}) {
  const { status, busy, backup } = wizard
  const nextYear = formatJalaliYear(year + 1)

  return (
    <ol className={closeYearStepsClass}>
      <CloseYearReconcileStep wizard={wizard} />
      <CloseYearStepRow
        index={2}
        done={status.opening.done}
        title={`مانده‌های اول ${nextYear}`}
        hint={`موجودی اول فروردین ${nextYear} در تب «${MONTHLY_BALANCE_SHEET}» ثبت می‌شود؛ طلب‌ها، بدهی‌ها و اقساط باز همان‌طور که هستند به سال بعد می‌روند`}
      >
        {status.opening.done ? null : (
          <div className={closeYearActionsClass}>
            <Button
              type="button"
              size="sm"
              loading={busy === 'opening'}
              disabled={busy !== null}
              onClick={() => void wizard.writeOpening()}
            >
              ثبت مانده‌ها
            </Button>
          </div>
        )}
      </CloseYearStepRow>
      <CloseYearStepRow
        index={3}
        done={status.archive.done}
        title={`آرشیو رکوردهای ${formatJalaliYear(year)}`}
        hint={archiveHint(wizard, year)}
      >
        <ArchiveProgress wizard={wizard} />
        {wizard.pendingArchiveRows ? (
          <div className={closeYearActionsClass}>
            <Button
              type="button"
              size="sm"
              loading={busy === 'archive'}
              disabled={busy !== null}
              onClick={() => void wizard.archiveYear()}
            >
              آرشیو کن
            </Button>
          </div>
        ) : null}
      </CloseYearStepRow>
      <CloseYearStepRow
        index={4}
        done={status.backup.done}
        title="پشتیبان کامل"
        hint={`زیپ همهٔ تب‌ها با آرشیوها؛ آخرین پشتیبان: ${
          wizard.lastBackupAt ? formatBackupDate(wizard.lastBackupAt) : 'هنوز گرفته نشده'
        }`}
      >
        {status.backup.done ? null : (
          <div className={closeYearActionsClass}>
            <Button
              type="button"
              size="sm"
              loading={backup.busy}
              disabled={backup.busy || busy !== null}
              onClick={() => void backup.download()}
            >
              <span>
                دانلود پشتیبان کامل (<bdi>.zip</bdi>)
              </span>
            </Button>
          </div>
        )}
      </CloseYearStepRow>
    </ol>
  )
}
