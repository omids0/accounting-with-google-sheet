import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  getDefaultSettings,
  getSettings,
  saveSettings,
  updateFormCategories,
} from './settings';
import {
  ensureSheetWithHeaders,
  fetchSheetRows,
  replaceSheetDataRows,
} from './sheets';

export const CATEGORIES_SHEET = 'دسته‌بندی‌ها';
export const CATEGORIES_HEADERS = ['نوع', 'دسته‌بندی'];

const FORM_TYPE_LABELS: Record<'income' | 'expense', string> = {
  income: 'درآمد',
  expense: 'هزینه',
};

export interface CategoryGroups {
  income: string[];
  expense: string[];
}

function parseFormType(value: string): 'income' | 'expense' | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'income' || normalized === 'درآمد') return 'income';
  if (normalized === 'expense' || normalized === 'هزینه') return 'expense';
  return null;
}

function rowsToGroups(rows: string[][]): CategoryGroups {
  const groups: CategoryGroups = { income: [], expense: [] };

  for (const row of rows) {
    const formType = parseFormType(row[0] ?? '');
    const category = String(row[1] ?? '').trim();
    if (!formType || !category) continue;
    if (!groups[formType].includes(category)) {
      groups[formType].push(category);
    }
  }

  return groups;
}

function groupsToRows(groups: CategoryGroups): string[][] {
  const rows: string[][] = [];
  for (const category of groups.income) {
    rows.push([FORM_TYPE_LABELS.income, category]);
  }
  for (const category of groups.expense) {
    rows.push([FORM_TYPE_LABELS.expense, category]);
  }
  return rows;
}

function applyGroupsToSettings(groups: CategoryGroups): void {
  const settings = getSettings() ?? getDefaultSettings();
  const forms = settings.forms.map((form) => {
    if (form.type !== 'income' && form.type !== 'expense') return form;
    const options = groups[form.type];
    return {
      ...form,
      fields: form.fields.map((field) =>
        field.id === 'category' ? { ...field, options } : field
      ),
    };
  });
  saveSettings({ ...settings, forms });
}

export async function ensureCategoriesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, CATEGORIES_SHEET, CATEGORIES_HEADERS);
}

export async function fetchCategoriesFromSheet(
  spreadsheetId: string
): Promise<CategoryGroups> {
  const rows = await fetchSheetRows(spreadsheetId, CATEGORIES_SHEET);
  return rowsToGroups(rows);
}

async function writeCategoriesToSheet(
  spreadsheetId: string,
  groups: CategoryGroups
): Promise<void> {
  await ensureCategoriesSheet(spreadsheetId);
  await replaceSheetDataRows(
    spreadsheetId,
    CATEGORIES_SHEET,
    groupsToRows(groups),
    CATEGORIES_HEADERS.length
  );
}

function withDefaults(groups: CategoryGroups): CategoryGroups {
  return {
    income: groups.income.length ? groups.income : [...DEFAULT_INCOME_CATEGORIES],
    expense: groups.expense.length
      ? groups.expense
      : [...DEFAULT_EXPENSE_CATEGORIES],
  };
}

export async function syncCategoriesFromSheet(
  spreadsheetId: string
): Promise<CategoryGroups> {
  await ensureCategoriesSheet(spreadsheetId);
  const fromSheet = await fetchCategoriesFromSheet(spreadsheetId);
  const groups = withDefaults(fromSheet);

  const needsSeed = !fromSheet.income.length || !fromSheet.expense.length;

  if (needsSeed) {
    await writeCategoriesToSheet(spreadsheetId, groups);
  }

  applyGroupsToSettings(groups);
  return groups;
}

export async function saveFormCategoriesToSheet(
  spreadsheetId: string,
  formId: string,
  categories: string[]
): Promise<void> {
  const settings = getSettings() ?? getDefaultSettings();
  const form = settings.forms.find((item) => item.id === formId);
  if (!form || (form.type !== 'income' && form.type !== 'expense')) {
    throw new Error('فرم دسته‌بندی معتبر نیست');
  }

  const current = await fetchCategoriesFromSheet(spreadsheetId);
  const next: CategoryGroups = {
    income:
      form.type === 'income'
        ? categories
        : withDefaults(current).income,
    expense:
      form.type === 'expense'
        ? categories
        : withDefaults(current).expense,
  };

  await writeCategoriesToSheet(spreadsheetId, next);
  updateFormCategories(formId, categories);
}
