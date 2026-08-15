import type { AppSettings, CategorySummary, CustomForm, DashboardData } from '../types';
import type { DateRange } from '../utils/dateRange';
import { isDateInRange } from '../utils/dateRange';
import { fetchRecords } from './sheets';

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

function sumByCategory(
  records: { values: Record<string, string> }[],
  amountKey = 'amount',
  categoryKey = 'category'
): CategorySummary[] {
  const map = new Map<string, number>();
  for (const r of records) {
    const amount = Number(r.values[amountKey]) || 0;
    const cat = r.values[categoryKey] || 'سایر';
    map.set(cat, (map.get(cat) ?? 0) + amount);
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export async function loadDashboardData(
  settings: AppSettings,
  range: DateRange
): Promise<DashboardData> {
  const incomeForm = settings.forms.find((f) => f.type === 'income');
  const expenseForm = settings.forms.find((f) => f.type === 'expense');

  const [incomeRecords, expenseRecords] = await Promise.all([
    incomeForm
      ? fetchRecords(settings.spreadsheetId, incomeForm)
      : Promise.resolve([]),
    expenseForm
      ? fetchRecords(settings.spreadsheetId, expenseForm)
      : Promise.resolve([]),
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
    (s, r) => s + (Number(r.values.amount) || 0),
    0
  );
  const totalExpense = filteredExpense.reduce(
    (s, r) => s + (Number(r.values.amount) || 0),
    0
  );

  const recent = [
    ...filteredIncome.map((r) => ({
      formName: incomeForm?.name ?? 'درآمد',
      title: r.values.title || '—',
      amount: Number(r.values.amount) || 0,
      type: 'income' as const,
      category: r.values.category || 'سایر',
      createdAt: r.createdAt,
    })),
    ...filteredExpense.map((r) => ({
      formName: expenseForm?.name ?? 'هزینه',
      title: r.values.title || '—',
      amount: Number(r.values.amount) || 0,
      type: 'expense' as const,
      category: r.values.category || 'سایر',
      createdAt: r.createdAt,
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeByCategory: sumByCategory(filteredIncome),
    expenseByCategory: sumByCategory(filteredExpense),
    recentRecords: recent,
  };
}
