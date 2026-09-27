import type { DangSplitGroupSummary } from '../types/dangSplit'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

const STATUS_LABELS: Record<DangSplitGroupSummary['people'][number]['status'], string> = {
  settled: 'تسویه کامل',
  partial: 'پرداخت جزئی',
  unpaid: 'نپرداخته',
  none: 'بدون سهم'
}

/** خروجی PDF جمع‌بندی دنگ: سهم، پرداختی و مانده هر نفر */
export async function exportDangSplitSummaryPdf(
  groupTitle: string,
  summary: DangSplitGroupSummary
): Promise<void> {
  const rows = summary.people.map(item => [
    item.name,
    formatMoney(item.share),
    formatMoney(item.paid),
    formatMoney(item.balance),
    STATUS_LABELS[item.status],
    item.breakdown.length.toLocaleString('fa-IR')
  ])

  rows.push([
    'جمع',
    formatMoney(summary.total),
    formatMoney(summary.paid),
    formatMoney(summary.balance),
    `${summary.settledCount.toLocaleString('fa-IR')} تسویه‌شده`,
    summary.expensesCount.toLocaleString('fa-IR')
  ])

  await downloadTablePdf({
    title: `جمع‌بندی دنگ: ${groupTitle}`,
    headers: ['نام', 'سهم', 'پرداخت‌شده', 'مانده', 'وضعیت', 'تعداد قلم'],
    rows,
    filename: `دنگ-${groupTitle}.pdf`,
    cellClasses: rows.map(() => [
      '',
      'pdf-cell-amount',
      'pdf-cell-amount',
      'pdf-cell-amount',
      '',
      ''
    ])
  })
}
