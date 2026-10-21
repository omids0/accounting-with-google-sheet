import { useState } from 'react'

import {
  exportAssemblyCsv,
  exportAssemblyPdf,
  type BuildingReport
} from '../../services/buildingAssembly'
import { runExport } from '../../utils/exportFeedback'
import Button from '../ui/Button'
import Card from '../ui/Card'
import {
  periodReportActionsClass,
  periodReportFactsClass,
  periodReportLinkClass,
  periodReportTitleClass
} from '../ui/periodReportStyles'

/**
 * «گزارش مجمع <سال>»: the report's tables and the fund balance as one PDF (or a CSV) to hand the
 * owners' meeting.
 */
export default function ReportAssemblyCard({ report }: { report: BuildingReport }) {
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null)

  const run = async (kind: 'pdf' | 'csv') => {
    setBusy(kind)
    await runExport(
      () => (kind === 'pdf' ? exportAssemblyPdf(report) : exportAssemblyCsv(report)),
      'ساخت گزارش مجمع انجام نشد'
    )
    setBusy(null)
  }

  return (
    <Card role="region" aria-label={report.title}>
      <h2 className={periodReportTitleClass}>{report.title}</h2>
      <p className={periodReportFactsClass}>
        وصول، هزینه‌ها، بدهکاران، بدهی ساختمان و ماندهٔ صندوق در یک فایل؛ انتقال‌ها و اصلاح موجودی
        در آن نیست.
      </p>
      <div className={periodReportActionsClass}>
        <Button
          type="button"
          size="sm"
          className="min-h-11 text-sm"
          loading={busy === 'pdf'}
          disabled={busy !== null}
          onClick={() => void run('pdf')}
        >
          ساخت PDF
        </Button>
        <button
          type="button"
          className={periodReportLinkClass}
          disabled={busy !== null}
          onClick={() => void run('csv')}
        >
          CSV
        </button>
      </div>
    </Card>
  )
}
