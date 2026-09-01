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
import { addJalaliMonths, getTodayIso, isoToJalali } from '../utils/jalaliDate';
import { exportSheetCsv, importSheetCsv, newImportId, newImportTimestamp } from './importExport';
import { normalizeSheetDate } from '../utils/sheetValues';
import { downloadTablePdf } from '../utils/pdf';
import { formatMoney } from '../utils/formatMoney';
import {
  formatInstallmentPayments,
  formatInstallmentPlanStatus,
  formatPersianDate,
} from '../utils/pdfFormat';
import {
  createLinkedExpenseRecord,
  deleteLinkedExpenseRecord,
} from './paymentTransactions';

const INSTALLMENTS_CACHE_TTL_MS = 30_000;
const installmentsCache = new Map<
  string,
  { expiresAt: number; plans: (InstallmentPlan & { rowNumber: number })[] }
>();
const paymentScheduleCache = new Map<string, InstallmentPayment[]>();

export function invalidateInstallmentsCache(spreadsheetId?: string): void {
  if (!spreadsheetId) {
    installmentsCache.clear();
    paymentScheduleCache.clear();
    return;
  }

  installmentsCache.delete(spreadsheetId);
  for (const key of paymentScheduleCache.keys()) {
    if (key.startsWith(`${spreadsheetId}:`)) {
      paymentScheduleCache.delete(key);
    }
  }
}

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

export function getInstallmentPaymentAmount(
  payment: InstallmentPayment,
  plan: InstallmentPlan
): number {
  return payment.amount ?? plan.amount;
}

/** Days after start in the same month that still count as the first installment due date. */
const SAME_MONTH_FIRST_DUE_GAP_DAYS = 5;

export function getFirstInstallmentDueDate(startDate: string, dueDay: number): string {
  const { day: startDay } = isoToJalali(startDate);
  if (dueDay > startDay) {
    if (dueDay - startDay <= SAME_MONTH_FIRST_DUE_GAP_DAYS) {
      return addJalaliMonths(startDate, 0, dueDay);
    }
    return addJalaliMonths(startDate, 1, dueDay);
  }
  return addJalaliMonths(startDate, 1, dueDay);
}

export function getInstallmentDueDate(
  startDate: string,
  dueDay: number,
  paymentIndex: number
): string {
  const firstDue = getFirstInstallmentDueDate(startDate, dueDay);
  return addJalaliMonths(firstDue, paymentIndex, dueDay);
}

export function getInstallmentEndDate(
  startDate: string,
  count: number,
  dueDay: number
): string {
  if (!startDate || !count || count < 1) return '';
  return getInstallmentDueDate(startDate, dueDay, count - 1);
}

export function getPaidUntilFromPlan(plan: InstallmentPlan): string {
  const paidPayments = plan.payments.filter((payment) => payment.paid);
  if (paidPayments.length === 0) return '';
  return paidPayments.reduce(
    (max, payment) => (payment.dueDate > max ? payment.dueDate : max),
    ''
  );
}

function applyPaidUntilToPayments(
  payments: InstallmentPayment[],
  paidUntil: string
): InstallmentPayment[] {
  if (!paidUntil) return payments;
  return payments.map((payment) => {
    if (payment.dueDate <= paidUntil) {
      return {
        ...payment,
        paid: true,
        paidAt: payment.paidAt || payment.dueDate,
      };
    }
    if (!payment.paid) return payment;
    return {
      ...payment,
      paid: false,
      paidAt: '',
      transactionRecordId: undefined,
    };
  });
}

function buildPayments(
  count: number,
  dueDay: number,
  startDate: string,
  amount: number,
  paidUntil = ''
): InstallmentPayment[] {
  const payments = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    paid: false,
    paidAt: '',
    dueDate: getInstallmentDueDate(startDate, dueDay, i),
    amount,
  }));
  return applyPaidUntilToPayments(payments, paidUntil);
}

function shouldRebuildPaymentSchedule(
  startDate: string,
  dueDay: number,
  payments: InstallmentPayment[]
): boolean {
  if (payments.length === 0) return true;

  const first = normalizeSheetDate(payments[0].dueDate);
  if (!first) return true;
  if (first <= startDate) return true;

  const expectedFirst = getInstallmentDueDate(startDate, dueDay, 0);
  if (first === expectedFirst) {
    return payments.some(
      (payment, index) =>
        normalizeSheetDate(payment.dueDate) !==
        getInstallmentDueDate(startDate, dueDay, index)
    );
  }

  const legacyFirst = addJalaliMonths(startDate, 0, dueDay);
  return first === legacyFirst;
}

function migratePaymentSchedule(
  parsed: InstallmentPayment[],
  startDate: string,
  dueDay: number,
  count: number,
  planAmount: number
): InstallmentPayment[] {
  const paidUntil = parsed
    .filter((payment) => payment.paid)
    .reduce(
      (max, payment) =>
        payment.dueDate > max ? normalizeSheetDate(payment.dueDate) : max,
      ''
    );

  const schedule = Array.from({ length: count }, (_, index) => {
    const existing = parsed[index];
    return {
      n: index + 1,
      paid: false,
      paidAt: '',
      dueDate: getInstallmentDueDate(startDate, dueDay, index),
      amount: existing?.amount ?? planAmount,
      transactionRecordId: undefined as string | undefined,
    };
  });

  return applyPaidUntilToPayments(schedule, paidUntil).map((payment, index) => ({
    ...payment,
    paidAt: payment.paid ? parsed[index]?.paidAt || payment.dueDate : '',
    transactionRecordId: payment.paid
      ? parsed[index]?.transactionRecordId
      : undefined,
  }));
}

function parsePayments(
  planId: string,
  raw: string,
  count: number,
  dueDay: number,
  startDate: string,
  planAmount: number
): InstallmentPayment[] {
  if (!raw) return buildPayments(count, dueDay, startDate, planAmount);

  const cacheKey = `${planId}:${raw}`;
  const cached = paymentScheduleCache.get(cacheKey);
  if (cached) return cached.map((payment) => ({ ...payment }));

  try {
    const parsed = JSON.parse(raw) as InstallmentPayment[];
    if (!Array.isArray(parsed) || parsed.length !== count) {
      return buildPayments(count, dueDay, startDate, planAmount);
    }

    const normalized = parsed.map((payment, index) => ({
      ...payment,
      n: index + 1,
      amount: payment.amount ?? planAmount,
      dueDate: normalizeSheetDate(payment.dueDate) || payment.dueDate,
    }));

    const result = shouldRebuildPaymentSchedule(startDate, dueDay, normalized)
      ? migratePaymentSchedule(normalized, startDate, dueDay, count, planAmount)
      : normalized;

    paymentScheduleCache.set(cacheKey, result);
    return result.map((payment) => ({ ...payment }));
  } catch {
    return buildPayments(count, dueDay, startDate, planAmount);
  }
}

function rowToPlan(row: string[], rowNumber: number): InstallmentPlan & { rowNumber: number } {
  const count = Number(row[4]) || 0;
  const dueDay = Number(row[5]) || 1;
  const startDate = normalizeSheetDate(row[6]) || getTodayIso();
  const planId = row[0] ?? '';
  return {
    rowNumber,
    id: planId,
    createdAt: row[1] ?? '',
    title: row[2] ?? '',
    amount: Number(row[3]) || 0,
    count,
    dueDay,
    startDate,
    note: row[7] ?? '',
    payments: parsePayments(planId, row[8] ?? '', count, dueDay, startDate, Number(row[3]) || 0),
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
  const cached = installmentsCache.get(spreadsheetId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.plans.map((plan) => ({
      ...plan,
      payments: plan.payments.map((payment) => ({ ...payment })),
    }));
  }

  const rows = await fetchSheetRows(spreadsheetId, INSTALLMENTS_SHEET);
  const plans = rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => String(row[0] ?? '').trim())
    .map(({ row, rowNumber }) => rowToPlan(row, rowNumber));

  installmentsCache.set(spreadsheetId, {
    plans,
    expiresAt: Date.now() + INSTALLMENTS_CACHE_TTL_MS,
  });

  return plans.map((plan) => ({
    ...plan,
    payments: plan.payments.map((payment) => ({ ...payment })),
  }));
}

export async function createInstallmentPlan(
  spreadsheetId: string,
  data: {
    title: string;
    amount: number;
    count: number;
    dueDay: number;
    startDate: string;
    note: string;
    paidUntil?: string;
  }
): Promise<InstallmentPlan> {
  const plan: InstallmentPlan = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    startDate: data.startDate,
    note: data.note,
    payments: buildPayments(
      data.count,
      data.dueDay,
      data.startDate,
      data.amount,
      data.paidUntil ?? ''
    ),
  };

  await appendSheetRow(spreadsheetId, INSTALLMENTS_SHEET, planToRow(plan));
  invalidateInstallmentsCache(spreadsheetId);
  return plan;
}

export async function updateInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number,
  plan: InstallmentPlan
): Promise<void> {
  await updateSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber, planToRow(plan));
  invalidateInstallmentsCache(spreadsheetId);
}

export async function deleteInstallmentPlan(
  spreadsheetId: string,
  rowNumber: number,
  plan?: InstallmentPlan
): Promise<void> {
  if (plan) {
    for (const payment of plan.payments) {
      if (payment.transactionRecordId) {
        await deleteLinkedExpenseRecord(spreadsheetId, payment.transactionRecordId);
      }
    }
  }
  await deleteSheetRow(spreadsheetId, INSTALLMENTS_SHEET, rowNumber);
  invalidateInstallmentsCache(spreadsheetId);
}

export function reconcilePaymentsOnEdit(
  plan: InstallmentPlan,
  data: {
    count: number;
    dueDay: number;
    amount: number;
    title: string;
    note: string;
    startDate: string;
    paidUntil?: string;
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
        amount: data.amount,
        dueDate: getInstallmentDueDate(data.startDate, data.dueDay, i),
      });
    } else {
      payments.push({
        n,
        paid: false,
        paidAt: '',
        dueDate: getInstallmentDueDate(data.startDate, data.dueDay, i),
        amount: data.amount,
      });
    }
  }

  const syncedPayments = applyPaidUntilToPayments(payments, data.paidUntil ?? '');

  return {
    ...plan,
    title: data.title,
    amount: data.amount,
    count: data.count,
    dueDay: data.dueDay,
    startDate: data.startDate,
    note: data.note,
    payments: syncedPayments,
  };
}

export function getRemovedPaymentTransactionIds(
  previousPayments: InstallmentPayment[],
  nextPayments: InstallmentPayment[]
): string[] {
  const ids: string[] = [];
  for (const previous of previousPayments) {
    const next = nextPayments.find((payment) => payment.n === previous.n);
    if (
      previous.paid &&
      previous.transactionRecordId &&
      next &&
      !next.paid
    ) {
      ids.push(previous.transactionRecordId);
    }
  }
  return ids;
}

export async function toggleInstallmentPayment(
  spreadsheetId: string,
  plan: InstallmentPlan & { rowNumber: number },
  paymentIndex: number,
  paid: boolean
): Promise<InstallmentPlan> {
  const payment = plan.payments[paymentIndex];

  if (paid && !payment.paid) {
    const amount = getInstallmentPaymentAmount(payment, plan);
    const transactionRecordId = await createLinkedExpenseRecord(spreadsheetId, {
      title: `قسط: ${plan.title} (#${payment.n})`,
      amount,
      category: 'قسط',
      note: plan.note,
    });
    const payments = plan.payments.map((p, index) => {
      if (index !== paymentIndex) return p;
      return {
        ...p,
        paid: true,
        paidAt: getTodayIso(),
        transactionRecordId,
      };
    });
    const updated: InstallmentPlan = { ...plan, payments };
    await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated);
    return updated;
  }

  if (!paid && payment.paid) {
    if (payment.transactionRecordId) {
      await deleteLinkedExpenseRecord(spreadsheetId, payment.transactionRecordId);
    }
    const payments = plan.payments.map((p, index) => {
      if (index !== paymentIndex) return p;
      return {
        ...p,
        paid: false,
        paidAt: '',
        transactionRecordId: undefined,
      };
    });
    const updated: InstallmentPlan = { ...plan, payments };
    await updateInstallmentPlan(spreadsheetId, plan.rowNumber, updated);
    return updated;
  }

  return plan;
}

export async function updateInstallmentPaymentAmount(
  spreadsheetId: string,
  plan: InstallmentPlan & { rowNumber: number },
  paymentIndex: number,
  amount: number
): Promise<InstallmentPlan> {
  const payments = plan.payments.map((payment, index) => {
    if (index !== paymentIndex) return payment;
    return { ...payment, amount };
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

export function getInstallmentDueDateInRange(
  plan: InstallmentPlan,
  range: DateRange
): string {
  const inRange = plan.payments
    .filter((payment) => isDateInRange(payment.dueDate, range))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (inRange.length === 0) return getNextInstallmentDueDate(plan);

  const unpaid = inRange.find((payment) => !payment.paid);
  return (unpaid ?? inRange[0]).dueDate;
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

/** Active plans stay visible even when the next due date is outside the current month. */
export function isInstallmentPlanVisible(
  plan: InstallmentPlan,
  range: DateRange
): boolean {
  if (!isInstallmentPlanComplete(plan)) return true;
  return hasInstallmentDueInRange(plan, range);
}

export function totalInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments.reduce(
    (sum, payment) => sum + getInstallmentPaymentAmount(payment, plan),
    0
  );
}

export function paidInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments
    .filter((payment) => payment.paid)
    .reduce((sum, payment) => sum + getInstallmentPaymentAmount(payment, plan), 0);
}

export function remainingInstallmentAmount(plan: InstallmentPlan): number {
  return Math.max(0, totalInstallmentAmount(plan) - paidInstallmentAmount(plan));
}

export function getInstallmentPaymentForDueDate(
  plan: InstallmentPlan,
  dueDate: string
): InstallmentPayment | undefined {
  if (!dueDate) return undefined;
  return plan.payments.find((payment) => payment.dueDate === dueDate);
}

export function getInstallmentDuePaymentAmount(
  plan: InstallmentPlan,
  dueDate: string
): number | null {
  const payment = getInstallmentPaymentForDueDate(plan, dueDate);
  if (!payment) return null;
  return getInstallmentPaymentAmount(payment, plan);
}

export function unpaidInstallmentAmount(plan: InstallmentPlan): number {
  return plan.payments
    .filter((p) => !p.paid)
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0);
}

export function unpaidInstallmentAmountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return plan.payments
    .filter((p) => !p.paid && isDateInRange(p.dueDate, range))
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0);
}

export function installmentAmountInRange(
  plan: InstallmentPlan,
  range: DateRange
): number {
  return plan.payments
    .filter((p) => isDateInRange(p.dueDate, range))
    .reduce((sum, p) => sum + getInstallmentPaymentAmount(p, plan), 0);
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
    formatInstallmentPayments(plan.payments, plan.amount),
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
      const planId = newImportId(cells[0] ?? '');
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
        ),
      };
      if (!plan.count || !plan.amount) return null;
      return planToRow(plan);
    }
  );
}
