import type { DangSplitGroupSummary } from '../types/dangSplit'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'

const STATUS_LABELS: Record<DangSplitGroupSummary['people'][number]['status'], string> = {
  settled: 'تسویه کامل',
  creditor: 'طلبکار',
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
    formatMoney(item.credit),
    formatMoney(item.paid),
    formatMoney(item.balance),
    STATUS_LABELS[item.status]
  ])

  rows.push([
    'جمع',
    formatMoney(summary.total),
    formatMoney(summary.covered),
    formatMoney(summary.paid),
    formatMoney(summary.debtTotal),
    `${summary.settledCount.toLocaleString('fa-IR')} تسویه‌شده`
  ])

  await downloadTablePdf({
    title: `جمع‌بندی دنگ: ${groupTitle}`,
    headers: ['نام', 'سهم', 'پرداختی بابت گروه', 'تسویه نقدی', 'مانده', 'وضعیت'],
    rows,
    filename: `دنگ-${groupTitle}.pdf`,
    cellClasses: rows.map(() => [
      '',
      'pdf-cell-amount',
      'pdf-cell-amount',
      'pdf-cell-amount',
      'pdf-cell-amount',
      ''
    ])
  })
}
