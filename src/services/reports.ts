import type { Check, Dang, InstallmentPlan } from '../types';
import { addDaysToIso, getTodayIso } from '../utils/jalaliDate';
import { fetchChecks } from './checks';
import { fetchDangs } from './dang';
import { fetchInstallmentPlans, getInstallmentPaymentAmount } from './installments';
import { fetchAllOpeningBalances } from './monthlyBalance';
import type { MonthlyOpeningBalance } from './monthlyBalance';

export type DueDateItemType = 'installment' | 'check' | 'dang';
export type DueDateStatus = 'overdue' | 'today' | 'upcoming';

export interface DueDateItem {
  type: DueDateItemType;
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: DueDateStatus;
  subtitle: string;
}

const DUE_DATE_TYPE_LABELS: Record<DueDateItemType, string> = {
  installment: 'قسط',
  check: 'چک',
  dang: 'بدهی',
};

export function getDueDateTypeLabel(type: DueDateItemType): string {
  return DUE_DATE_TYPE_LABELS[type];
}

function classifyDueDate(dueDate: string, today: string): DueDateStatus {
  const normalized = dueDate.slice(0, 10);
  if (normalized < today) return 'overdue';
  if (normalized === today) return 'today';
  return 'upcoming';
}

function collectInstallmentDueItems(
  plans: InstallmentPlan[],
  today: string,
  horizonEnd: string
): DueDateItem[] {
  const items: DueDateItem[] = [];

  for (const plan of plans) {
    for (const payment of plan.payments) {
      if (payment.paid) continue;
      const dueDate = payment.dueDate.slice(0, 10);
      if (dueDate > horizonEnd) continue;

      items.push({
        type: 'installment',
        id: `${plan.id}-${payment.n}`,
        title: plan.title,
        amount: getInstallmentPaymentAmount(payment, plan),
        dueDate,
        status: classifyDueDate(dueDate, today),
        subtitle: `قسط ${payment.n.toLocaleString('fa-IR')}`,
      });
    }
  }

  return items;
}

function collectCheckDueItems(
  checks: Check[],
  today: string,
  horizonEnd: string
): DueDateItem[] {
  return checks
    .filter((check) => !check.paid)
    .filter((check) => check.dueDate.slice(0, 10) <= horizonEnd)
    .map((check) => {
      const dueDate = check.dueDate.slice(0, 10);
      return {
        type: 'check' as const,
        id: check.id,
        title: check.counterparty || check.checkNumber || 'چک',
        amount: check.amount,
        dueDate,
        status: classifyDueDate(dueDate, today),
        subtitle: check.checkNumber ? `شماره ${check.checkNumber}` : 'چک',
      };
    });
}

function collectDangDueItems(dangs: Dang[], today: string, horizonEnd: string): DueDateItem[] {
  return dangs
    .filter((dang) => !dang.paid)
    .filter((dang) => dang.date.slice(0, 10) <= horizonEnd)
    .map((dang) => {
      const dueDate = dang.date.slice(0, 10);
      return {
        type: 'dang' as const,
        id: dang.id,
        title: dang.title,
        amount: dang.amount,
        dueDate,
        status: classifyDueDate(dueDate, today),
        subtitle: dang.counterparty || dang.category || 'بدهی',
      };
    });
}

export async function loadDueDatesReport(
  spreadsheetId: string,
  daysAhead = 30,
  todayIso = getTodayIso()
): Promise<DueDateItem[]> {
  const today = todayIso.slice(0, 10);
  const horizonEnd = addDaysToIso(today, daysAhead).slice(0, 10);

  const [plans, checks, dangs] = await Promise.all([
    fetchInstallmentPlans(spreadsheetId).catch(() => []),
    fetchChecks(spreadsheetId).catch(() => []),
    fetchDangs(spreadsheetId).catch(() => []),
  ]);

  return [
    ...collectInstallmentDueItems(plans, today, horizonEnd),
    ...collectCheckDueItems(checks, today, horizonEnd),
    ...collectDangDueItems(dangs, today, horizonEnd),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function loadOpeningBalancesReport(
  spreadsheetId: string
): Promise<MonthlyOpeningBalance[]> {
  return fetchAllOpeningBalances(spreadsheetId);
}
