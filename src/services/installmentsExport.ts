import type { InstallmentPlan } from '../types'
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport'
import { sortInstallmentPlans } from './installmentsCalculations'
import { INSTALLMENTS_HEADERS, INSTALLMENTS_SHEET } from './installmentsConstants'
import { fetchInstallmentPlans, planToRow } from './installmentsCrud'
import { parsePayments } from './installmentsSchedule'
import { formatMoney } from '../utils/formatMoney'
import { getTodayIso } from '../utils/jalaliDate'
import { downloadTablePdf } from '../utils/pdf'
import {
  formatInstallmentPayments,
  formatInstallmentPlanStatus,
  formatPersianDate
} from '../utils/pdfFormat'

export async function exportInstallmentsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(spreadsheetId, INSTALLMENTS_SHEET, INSTALLMENTS_HEADERS, 'اقساط.csv')
}

export async function exportInstallmentsPdf(spreadsheetId: string): Promise<void> {
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

  await downloadTablePdf({
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
      const title = (cells[2] ?? '').trim()

      if (!title) return null

      const count = Number(cells[4]) || 0

      const dueDay = Number(cells[5]) || 1

      const startDate = (cells[6] ?? '').trim() || getTodayIso()

      const planId = newImportId(cells[0] ?? '')

      const plan: InstallmentPlan = {
        id: planId,
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        amount: Number(cells[3]) || 0,
        count,
        dueDay,
        startDate,
        note: cells[7] ?? '',
        payments: parsePayments(
          planId,
          cells[8] ?? '',
          count,
          dueDay,
          startDate,
          Number(cells[3]) || 0
        )
      }

      if (!plan.count || !plan.amount) return null

      return planToRow(plan)
    }
  )
}
