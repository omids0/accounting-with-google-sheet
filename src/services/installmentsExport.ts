import type { InstallmentPlan } from '../types'
import { INSTALLMENT_ATTACHMENT_COLUMN } from './attachmentColumn'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { sortInstallmentPlans } from './installmentsCalculations'
import { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET } from './installmentsConstants'
import { fetchInstallmentPlans, planToRow } from './installmentsCrud'
import { validateInstallmentsCsvCells } from './installmentsCsvValidate'
import { parsePayments } from './installmentsSchedule'
import {
  parseAttachmentIds,
  serializeAttachmentIds,
  withAttachmentCell
} from '../utils/attachmentIds'
import { formatMoney } from '../utils/formatMoney'
import { downloadTablePdf } from '../utils/pdf'
import {
  formatInstallmentPayments,
  formatInstallmentPlanStatus,
  formatPersianDate
} from '../utils/pdfFormat'

export async function exportInstallmentsCsv(spreadsheetId: string): Promise<string | null> {
  return exportSheetCsv(spreadsheetId, INSTALLMENTS_SHEET, INSTALLMENTS_HEADERS, 'اقساط.csv')
}

export async function exportInstallmentsPdf(spreadsheetId: string): Promise<string | null> {
  const plans = sortInstallmentPlans(await fetchInstallmentPlans(spreadsheetId))

  const headers = [
    'عنوان',
    'مبلغ قسط',
    'تعداد',
    'موعد ماهانه',
    'تاریخ شروع',
    'وضعیت',
    'توضیحات',
    'جزئیات پرداخت'
  ]

  const rows = plans.map(plan => [
    plan.title,
    formatMoney(plan.amount),
    plan.count.toLocaleString('fa-IR'),
    plan.dueDay.toLocaleString('fa-IR'),
    formatPersianDate(plan.startDate),
    formatInstallmentPlanStatus(plan),
    plan.note,
    formatInstallmentPayments(plan.payments, plan.amount)
  ])

  const cellClasses = plans.map(() => [
    '',
    'pdf-cell-amount',
    '',
    '',
    '',
    '',
    '',
    'pdf-cell-multiline'
  ])

  return downloadTablePdf({
    title: 'گزارش اقساط',
    headers,
    rows,
    filename: 'اقساط.pdf',
    cellClasses
  })
}

export async function importInstallmentsCsv(spreadsheetId: string, csvContent: string) {
  return importSheetCsv(
    spreadsheetId,
    INSTALLMENTS_SHEET,
    INSTALLMENTS_HEADERS,
    csvContent,
    cells => {
      const { title, amount, count, dueDay, startDate } = validateInstallmentsCsvCells(cells)

      const planId = newImportId(cells[0] ?? '')

      const plan: InstallmentPlan = {
        id: planId,
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        amount,
        count,
        dueDay,
        startDate,
        note: cells[7] ?? '',
        subCategory: cells[9] ?? '',
        payments: parsePayments(planId, cells[8] ?? '', count, dueDay, startDate, amount)
      }

      return withAttachmentCell(
        planToRow(plan),
        INSTALLMENT_ATTACHMENT_COLUMN,
        serializeAttachmentIds(parseAttachmentIds(cells[INSTALLMENT_ATTACHMENT_COLUMN]))
      )
    }
  )
}
