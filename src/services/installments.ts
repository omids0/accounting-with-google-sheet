import type { InstallmentPayment, InstallmentPlan } from '../types';
import type { DateRange } from '../utils/dateRange';
import { isDateInRange } from '../utils/dateRange';
import {
  appendSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  updateSheetRow,
  deleteSheetRow,
} from './sheets';
import { addJalaliMonths, getTodayIso } from '../utils/jalaliDate';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';
import { downloadTablePdf } from '../utils/pdf';
import { formatMoney } from '../utils/formatMoney';
import {
  formatInstallmentPayments,
  formatInstallmentPlanStatus,
  formatPersianDate,
} from '../utils/pdfFormat';

export const INSTALLMENTS_SHEET = 'اقساط';

export const INSTALLMENTS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'مبلغ قسط',
  'تعداد بازپرداخت',
  'موعد در ماه',
  'تاریخ شروع',
  'توضیحات',
  'وضعیت پرداخت',
];

function buildPayments(
  count: number,
  dueDay: number,
  startDate: string
): InstallmentPayment[] {
  return Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    paid: false,
    paidAt: '',
    dueDate: addJalaliMonths(startDate, i, dueDay),
  }));
}

function parsePayments(
  raw: string,
  count: number,
  dueDay: number,
  startDate: string
): InstallmentPayment[] {
  if (!raw) return buildPayments(count, dueDay, startDate);
  try {
    const parsed = JSON.parse(raw) as InstallmentPayment[];
    if (Array.isArray(parsed) && parsed.length === count) return parsed;
  } catch {
    /* use default */
  }
  return buildPayments(count, dueDay, startDate);
}

function rowToPlan(row: string[], rowNumber: number): InstallmentPlan & { rowNumber: number } {
  const count = Number(row[4]) || 0;
  const dueDay = Number(row[5]) || 1;
  const startDate = row[6] || getTodayIso();
  return {
    rowNumber,
    id: row[0] ?? '',
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    amount: Number(row[3]) || 0,
    count,
    dueDay,
    startDate,
    note: row[7] ?? '',
    payments: parsePayments(row[8] ?? '', count, dueDay, startDate),
  };
}

function planToRow(plan: InstallmentPlan): string[] {
  return [
    plan.id,
    plan.createdAt,
    plan.title,
    String(plan.amount),
    String(plan.count),
    String(plan.dueDay),
    plan.startDate,
    plan.note,
    JSON.stringify(plan.payments),
  ];
}

export async function ensureInstallmentsSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(
    spreadsheetId,
    INSTALLMENTS_SHEET,
    INSTALLMENTS_HEADERS
  );
}

export async function fetchInstallmentPlans(
  spreadsheetId: string
): Promise<(InstallmentPlan & { rowNumber: number })[]> {
  const rows = await fetchSheetRows(spreadsheetId, INSTALLMENTS_SHEET);
  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToPlan(row, rowNumber));
}

export async function createInstallmentPlan(
  spreadsheetId: string,
  data: {
    title: string;
    amount: number;
    count: number;
    dueDay: number;
    note: string;
  }
): Promise<InstallmentPlan> {
  const startDate = getTodayIso();
  const plan: InstallmentPlan = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    startDate,
    note: data.note,
    payments: buildPayments(data.count, data.dueDay, startDate),
  };

  await appendSheetRow(spreadsheetId, INSTALLMENTS_SHEET, planToRow(plan));
  return plan;
}

export async function updateInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number,
  plan: InstallmentPlan
): Promise<void> {
  await updateSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber, planToRow(plan));
}

export async function deleteInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber);
}

export function reconcilePaymentsOnEdit(
  plan: InstallmentPlan,
  data: {
    count: number;
    dueDay: number;
    amount: number;
    title: string;
    note: string;
  }
): InstallmentPlan | { error: string } {
  if (data.count < plan.payments.filter((p) => p.paid).length) {
    return { error: 'تعداد بازپرداخت نمی‌تواند کمتر از اقساط پرداخت‌شده باشد' };
  }

  const removedPaid = plan.payments.slice(data.count).some((p) => p.paid);
  if (removedPaid) {
    return { error: 'نمی‌توان اقساط پرداخت‌شده را حذف کرد' };
  }

  const payments: InstallmentPayment[] = [];
  for (let i = 0; i < data.count; i++) {
    const n = i + 1;
    const existing = plan.payments[i];
    if (existing) {
      payments.push({
        ...existing,
        n,
        dueDate: existing.paid
          ? existing.dueDate
          : addJalaliMonths(plan.startDate, i, data.dueDay),
      });
    } else {
      payments.push({
        n,
        paid: false,
        paidAt: '',
        dueDate: addJalaliMonths(plan.startDate, i, data.dueDay),
      });
    }
  }

  return {
    ...plan,
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    note: data.note,
    payments,
  };
}

export async function toggleInstallmentPayment(
  spreadsheetId: string,
  plan: InstallmentPlan & { rowNumber: number },
  paymentIndex: number,
  paid: boolean
): Promise<InstallmentPlan> {
  const payments = plan.payments.map((payment, index) => {
    if (index !== paymentIndex) return payment;
    return {
      ...payment,
      paid,
      paidAt: paid ? getTodayIso() : '',
    };
  });

  const updated: InstallmentPlan = { ...plan, payments };
  await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated);
  return updated;
}

export function isInstallmentPlanComplete(plan: InstallmentPlan): boolean {
  return plan.count > 0 && plan.payments.every((p) => p.paid);
}

export function getNextInstallmentDueDate(plan: InstallmentPlan): string {
  const next = plan.payments.find((p) => !p.paid);
  return next?.dueDate ?? plan.payments[plan.payments.length - 1]?.dueDate ?? '';
}

export function sortInstallmentPlans<T extends InstallmentPlan>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const aComplete = isInstallmentPlanComplete(a);
    const bComplete = isInstallmentPlanComplete(b);

    if (aComplete !== bComplete) return aComplete ? 1 : -1;

    const aDue = getNextInstallmentDueDate(a);
    const bDue = getNextInstallmentDueDate(b);
    return aDue.localeCompare(bDue);
  });
}

export function sortInstallmentPayments(
  payments: InstallmentPayment[]
): { payment: InstallmentPayment; index: number }[] {
  return payments
    .map((payment, index) => ({ payment, index }))
    .sort((a, b) => {
      if (a.payment.paid !== b.payment.paid) return a.payment.paid ? 1 : -1;
      return a.payment.dueDate.localeCompare(b.payment.dueDate);
    });
}

export function unpaidInstallmentCount(plan: InstallmentPlan): number {
  return plan.payments.filter((p) => !p.paid).length;
}

export function unpaidInstallmentCountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return plan.payments.filter(
    (p) => !p.paid && isDateInRange(p.dueDate, range)
  ).length;
}

export function installmentCountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return plan.payments.filter((p) => isDateInRange(p.dueDate, range)).length;
}

/** Plan is relevant when at least one installment is due in the range (e.g. current month). */
export function hasInstallmentDueInRange(
  plan: InstallmentPlan,
  range: DateRange
): boolean {
  return installmentCountInRange(plan, range) > 0;
}

export function unpaidInstallmentAmount(plan: InstallmentPlan): number {
  return unpaidInstallmentCount(plan) * plan.amount;
}

export function unpaidInstallmentAmountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return unpaidInstallmentCountInRange(plan, range) * plan.amount;
}

export function installmentAmountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return installmentCountInRange(plan, range) * plan.amount;
}

export function totalUnpaidInstallments(
  plans: InstallmentPlan[],
  range: DateRange
): number {
  return plans.reduce(
    (sum, plan) => sum + unpaidInstallmentAmountInRange(plan, range),
    0
  );
}

export function totalInstallmentsInRange(
  plans: InstallmentPlan[],
  range: DateRange
): number {
  return plans.reduce(
    (sum, plan) => sum + installmentAmountInRange(plan, range),
    0
  );
}

export async function exportInstallmentsCsv(spreadsheetId: string): Promise<void> {
  await exportSheetCsv(
    spreadsheetId,
    INSTALLMENTS_SHEET,
    INSTALLMENTS_HEADERS,
    'اقساط.csv'
  );
}

export async function exportInstallmentsPdf(spreadsheetId: string): Promise<void> {
  const plans = sortInstallmentPlans(await fetchInstallmentPlans(spreadsheetId));
  const headers = [
    'عنوان',
    'مبلغ قسط',
    'تعداد',
    'موعد ماهانه',
    'تاریخ شروع',
    'وضعیت',
    'توضیحات',
    'جزئیات پرداخت',
  ];
  const rows = plans.map((plan) => [
    plan.title,
    formatMoney(plan.amount),
    plan.count.toLocaleString('fa-IR'),
    plan.dueDay.toLocaleString('fa-IR'),
    formatPersianDate(plan.startDate),
    formatInstallmentPlanStatus(plan),
    plan.note,
    formatInstallmentPayments(plan.payments),
  ]);
  const cellClasses = plans.map(() => [
    '',
    'pdf-cell-amount',
    '',
    '',
    '',
    '',
    '',
    'pdf-cell-multiline',
  ]);

  await downloadTablePdf({
    title: 'گزارش اقساط',
    headers,
    rows,
    filename: 'اقساط.pdf',
    cellClasses,
  });
}

export async function importInstallmentsCsv(
  spreadsheetId: string,
  csvContent: string
) {
  return importSheetCsv(
    spreadsheetId,
    INSTALLMENTS_SHEET,
    INSTALLMENTS_HEADERS,
    csvContent,
    (cells) => {
      const title = (cells[2] ?? '').trim();
      if (!title) return null;
      const count = Number(cells[4]) || 0;
      const dueDay = Number(cells[5]) || 1;
      const startDate = (cells[6] ?? '').trim() || getTodayIso();
      const plan: InstallmentPlan = {
        id: newImportId(cells[0] ?? ''),
        createdAt: newImportTimestamp(cells[1] ?? ''),
        title,
        amount: Number(cells[3]) || 0,
        count,
        dueDay,
        startDate,
        note: cells[7] ?? '',
        payments: parsePayments(cells[8] ?? '', count, dueDay, startDate),
      };
      if (!plan.count || !plan.amount) return null;
      return planToRow(plan);
    }
  );
}
