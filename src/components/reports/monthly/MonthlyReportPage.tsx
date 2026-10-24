import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import MonthlyReportPreview from './MonthlyReportPreview'
import { useMonthlyReportState } from './useMonthlyReportState'
import { useDataRefresh } from '../../../hooks/useDataRefresh'
import { REPORT_MONTH_PARAM } from '../../../routes/paths'
import { getUserName } from '../../../services/auth'
import {
  getMonthlyReportState,
  markMonthlyReportHandled,
  monthlyReportDue,
  setMonthlyReportOn
} from '../../../services/monthlyReportGate'
import { saveMonthlyReportPdf } from '../../../services/monthlyReportPdf'
import { loadMonthlyReportSource, type MonthlyReportSource } from '../../../services/reportsLoad'
import { getSettings, isConfigured } from '../../../services/settings'
import { requireAuth } from '../../../utils/authGuard'
import {
  formatJalaliMonthLabel,
  getJalaliMonthKey,
  listJalaliMonthKeys,
  parseJalaliMonthKey,
  previousJalaliMonthKey
} from '../../../utils/dateRange'
import { runExport } from '../../../utils/exportFeedback'
import { getTodayIso } from '../../../utils/jalaliDate'
import { handleSheetError } from '../../../utils/sheetError'
import { showInfo } from '../../../utils/toast'
import { Select } from '../../form'
import { DashboardSkeleton } from '../../skeleton'
import Button from '../../ui/Button'
import Card from '../../ui/Card'
import { emptyStateClass } from '../../ui/displayStyles'
import {
  periodReportActionsClass,
  periodReportLinkClass,
  periodReportPickerClass,
  periodReportPickerLabelClass
} from '../../ui/periodReportStyles'
import { reportPageClass } from '../../ui/toolsPageStyles'

/** «گزارش ماهانه»: any past month as the one-page PDF, shared or saved. */
export default function MonthlyReportPage() {
  const [params, setParams] = useSearchParams()
  const spreadsheetId = getSettings()?.spreadsheetId
  const revision = useDataRefresh()
  const reportState = useMonthlyReportState(spreadsheetId)
  const [source, setSource] = useState<MonthlyReportSource | null>(null)
  const [busy, setBusy] = useState<'share' | 'save' | null>(null)
  const [failed, setFailed] = useState(false)

  const lastMonth = previousJalaliMonthKey(getJalaliMonthKey(getTodayIso()))
  const requested = params.get(REPORT_MONTH_PARAM) ?? ''
  const monthKey = parseJalaliMonthKey(requested) && requested <= lastMonth ? requested : lastMonth

  useEffect(() => {
    const settings = getSettings()

    if (!settings || !isConfigured() || !requireAuth()) return

    let live = true

    loadMonthlyReportSource(settings)
      .then(next => live && setSource(next))
      .catch(err => {
        if (live) setFailed(true)
        handleSheetError(err, { fallbackMessage: 'خطا در بارگذاری گزارش' })
      })

    return () => {
      live = false
    }
  }, [revision])

  // Opening the report counts as viewing the first-of-month row.
  useEffect(() => {
    if (spreadsheetId && monthlyReportDue(getMonthlyReportState(spreadsheetId))) {
      markMonthlyReportHandled(spreadsheetId)
    }
  }, [spreadsheetId])

  const report = useMemo(() => source?.build(monthKey) ?? null, [source, monthKey])

  const options = useMemo(() => {
    const first = source?.firstMonth && source.firstMonth < monthKey ? source.firstMonth : monthKey

    return listJalaliMonthKeys(first, lastMonth)
      .reverse()
      .map(key => ({ value: key, label: formatJalaliMonthLabel(key) }))
  }, [source, monthKey, lastMonth])

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  if (!report) {
    return failed ? (
      <div className={emptyStateClass}>
        <p>گزارش بارگذاری نشد</p>
      </div>
    ) : (
      <DashboardSkeleton variant="report" />
    )
  }

  const exportPdf = async (share: boolean) => {
    setBusy(share ? 'share' : 'save')
    await runExport(() => saveMonthlyReportPdf(report, getUserName(), share), 'ساخت PDF انجام نشد')
    setBusy(null)
  }

  const turnOff = () => {
    if (!spreadsheetId) return
    setMonthlyReportOn(spreadsheetId, false)
    showInfo('گزارش اول ماه دیگر روی داشبورد نمی‌آید؛ از تنظیمات › گزارش‌ها روشنش کن')
  }

  return (
    <div className={reportPageClass}>
      <Card className={periodReportPickerClass}>
        <span className={periodReportPickerLabelClass}>ماه گزارش</span>
        <Select
          value={monthKey}
          options={options}
          aria-label="ماه گزارش"
          compact
          onChange={value => setParams({ [REPORT_MONTH_PARAM]: value }, { replace: true })}
        />
      </Card>

      <MonthlyReportPreview report={report} owner={getUserName()} />

      <div className={periodReportActionsClass}>
        <Button
          type="button"
          size="sm"
          loading={busy === 'share'}
          disabled={!!busy}
          onClick={() => void exportPdf(true)}
        >
          اشتراک PDF
        </Button>
        <button
          type="button"
          className={periodReportLinkClass}
          disabled={!!busy}
          onClick={() => void exportPdf(false)}
        >
          ذخیره
        </button>
        {spreadsheetId && !reportState.off ? (
          <button type="button" className={periodReportLinkClass} onClick={turnOff}>
            هر ماه نفرست
          </button>
        ) : null}
      </div>
    </div>
  )
}
