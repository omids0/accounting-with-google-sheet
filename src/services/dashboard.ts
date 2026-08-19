import type {
  AppSettings,
  CategorySummary,
  CustomForm,
  DashboardData,
  MonthlyFlow,
} from '../types';
import type { DateRange } from '../utils/dateRange';
import { getJalaliParts } from '../utils/jalaliDate';
import { parseNumeric } from '../utils/parseNumeric';
import {
  formatJalaliMonthLabel,
  getDateRange,
  getJalaliMonthKey,
  isDateInRange,
} from '../utils/dateRange';
import { normalizeSheetDate } from '../utils/sheetValues';
import { fetchDangs, unpaidDangTotal } from './dang';
import { fetchInstallmentPlans, totalUnpaidInstallments } from './installments';
import { fetchChecks, totalUnpaidChecksInRange } from './checks';
import { fetchOpeningBalance } from './monthlyBalance';
import { fetchReceivables, remainingAmount } from './receivables';
import { fetchRecords } from './sheets';
import { fetchTgjuPrices } from './tgju';
import { computeHoldings, fetchVaultTransactions } from './treasury';
import { fetchWalletAccounts } from './wallet';

function getDateFieldId(form: CustomForm | undefined): string {
  return form?.fields.find((f) => f.type === 'date')?.id ?? 'date';
}

function filterByDateRange<T extends { values: Record<string, string> }>(
  records: T[],
  range: DateRange,
  dateFieldId: string
): T[] {
  return records.filter((r) =>
    isDateInRange(r.values[dateFieldId] ?? '', range)
  );
}

function aggregateYearToDateMonthlyFlow(
  incomeRecords: { values: Record<string, string> }[],
  expenseRecords: { values: Record<string, string> }[],
  incomeDateField: string,
  expenseDateField: string
): MonthlyFlow[] {
  const range = getDateRange('year-to-date');
  const totals = new Map<string, { income: number; expense: number }>();

  for (const record of incomeRecords) {
    const date = normalizeSheetDate(record.values[incomeDateField] ?? '');
    if (!date || !isDateInRange(date, range)) continue;
    const monthKey = getJalaliMonthKey(date);
    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 };
    entry.income += parseNumeric(record.values.amount);
    totals.set(monthKey, entry);
  }

  for (const record of expenseRecords) {
    const date = normalizeSheetDate(record.values[expenseDateField] ?? '');
    if (!date || !isDateInRange(date, range)) continue;
    const monthKey = getJalaliMonthKey(date);
    const entry = totals.get(monthKey) ?? { income: 0, expense: 0 };
    entry.expense += parseNumeric(record.values.amount);
    totals.set(monthKey, entry);
  }

  const { year: jy, month: currentMonth } = getJalaliParts(new Date());
  const flow: MonthlyFlow[] = [];

  for (let month = 1; month <= currentMonth; month += 1) {
    const monthKey = `${jy}-${String(month).padStart(2, '0')}`;
    const { income = 0, expense = 0 } = totals.get(monthKey) ?? {};
    flow.push({
      monthKey,
      label: formatJalaliMonthLabel(monthKey),
      income,
      expense,
      net: income - expense,
    });
  }

  return flow;
}

function sumByCategory(
  records: { values: Record<string, string> }[],
  amountKey = 'amount',
  categoryKey = 'category'
): CategorySummary[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const amount = parseNumeric(r.values[amountKey]);
    const cat = r.values[categoryKey] || 'سایر';
    map.set(cat, (map.get(cat) ?? 0) + amount);
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export async function loadDashboardData(
  settings: AppSettings,
  range: DateRange,
  installmentRange: DateRange = range
): Promise<DashboardData> {
  const incomeForm = settings.forms.find((f) => f.type === 'income');
  const expenseForm = settings.forms.find((f) => f.type === 'expense');
  const monthKey = getJalaliMonthKey(range.start);

  const [
    incomeRecords,
    expenseRecords,
    walletAccounts,
    vaultTransactions,
    receivables,
    installmentPlans,
    checks,
    dangs,
    openingBalanceRecord,
    tgjuPrices,
  ] = await Promise.all([
    incomeForm
      ? fetchRecords(settings.spreadsheetId, incomeForm)
      : Promise.resolve([]),
    expenseForm
      ? fetchRecords(settings.spreadsheetId, expenseForm)
      : Promise.resolve([]),
    fetchWalletAccounts(settings.spreadsheetId).catch(() => []),
    fetchVaultTransactions(settings.spreadsheetId).catch(() => []),
    fetchReceivables(settings.spreadsheetId).catch(() => []),
    fetchInstallmentPlans(settings.spreadsheetId).catch(() => []),
    fetchChecks(settings.spreadsheetId).catch(() => []),
    fetchDangs(settings.spreadsheetId).catch(() => []),
    fetchOpeningBalance(settings.spreadsheetId, monthKey).catch(() => ({
      monthKey,
      amount: 0,
      updatedAt: '',
      note: '',
    })),
    fetchTgjuPrices().catch(() => null),
  ]);

  const incomeDateField = getDateFieldId(incomeForm);
  const expenseDateField = getDateFieldId(expenseForm);

  const filteredIncome = filterByDateRange(
    incomeRecords,
    range,
    incomeDateField
  );
  const filteredExpense = filterByDateRange(
    expenseRecords,
    range,
    expenseDateField
  );

  const totalIncome = filteredIncome.reduce(
    (s, r) => s + parseNumeric(r.values.amount),
    0
  );
  const totalExpense = filteredExpense.reduce(
    (s, r) => s + parseNumeric(r.values.amount),
    0
  );

  const walletTotal = walletAccounts.reduce((s, a) => s + a.balance, 0);
  const holdings = tgjuPrices
    ? computeHoldings(vaultTransactions, tgjuPrices)
    : [];
  const treasuryTotal = holdings.reduce((s, h) => s + h.totalValue, 0);
  const receivablesTotal = receivables.reduce(
    (s, r) => s + remainingAmount(r),
    0
  );
  const totalAssets = walletTotal + treasuryTotal + receivablesTotal;
  const installmentsDue = totalUnpaidInstallments(installmentPlans, installmentRange);
  const checksDue = totalUnpaidChecksInRange(checks, installmentRange);
  const dangsTotal = unpaidDangTotal(dangs);
  const totalLiabilities = installmentsDue + dangsTotal + checksDue;
  const netAvailable = totalAssets - totalLiabilities;

  const openingBalance = openingBalanceRecord.amount;
  const periodBalance = openingBalance + totalIncome - totalExpense;
  const reconciliationDiff = walletTotal - periodBalance;

  const recent = [
    ...filteredIncome.map((r) => ({
      formName: incomeForm?.name ?? 'درآمد',
      title: r.values.title || '—',
      amount: parseNumeric(r.values.amount),
      type: 'income' as const,
      category: r.values.category || 'سایر',
      date: r.values[incomeDateField] ?? '',
      createdAt: r.createdAt,
    })),
    ...filteredExpense.map((r) => ({
      formName: expenseForm?.name ?? 'هزینه',
      title: r.values.title || '—',
      amount: parseNumeric(r.values.amount),
      type: 'expense' as const,
      category: r.values.category || 'سایر',
      date: r.values[expenseDateField] ?? '',
      createdAt: r.createdAt,
    })),
  ]
    .sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '');
      if (byDate !== 0) return byDate;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    })
    .map(({ createdAt: _, ...record }) => record);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    openingBalance,
    periodBalance,
    reconciliationDiff,
    monthKey,
    monthLabel: formatJalaliMonthLabel(monthKey),
    financial: {
      walletTotal,
      treasuryTotal,
      receivablesTotal,
      totalAssets,
      installmentsDue,
      dangsTotal,
      checksDue,
      totalLiabilities,
      netAvailable,
    },
    incomeByCategory: sumByCategory(filteredIncome),
    expenseByCategory: sumByCategory(filteredExpense),
    yearlyMonthlyFlow: aggregateYearToDateMonthlyFlow(
      incomeRecords,
      expenseRecords,
      incomeDateField,
      expenseDateField
    ),
    recentRecords: recent,
  };
}
