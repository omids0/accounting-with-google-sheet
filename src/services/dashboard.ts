import type { AppSettings, CategorySummary, DashboardData } from '../types';
import { fetchRecords } from './sheets';

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
  settings: AppSettings
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

  const totalIncome = incomeRecords.reduce(
    (s, r) => s + (Number(r.values.amount) || 0),
    0
  );
  const totalExpense = expenseRecords.reduce(
    (s, r) => s + (Number(r.values.amount) || 0),
    0
  );

  const recent = [
    ...incomeRecords.map((r) => ({
      formName: incomeForm?.name ?? 'درآمد',
      title: r.values.title || '—',
      amount: Number(r.values.amount) || 0,
      type: 'income' as const,
      createdAt: r.createdAt,
    })),
    ...expenseRecords.map((r) => ({
      formName: expenseForm?.name ?? 'هزینه',
      title: r.values.title || '—',
      amount: Number(r.values.amount) || 0,
      type: 'expense' as const,
      createdAt: r.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    incomeByCategory: sumByCategory(incomeRecords),
    expenseByCategory: sumByCategory(expenseRecords),
    recentRecords: recent,
  };
}
