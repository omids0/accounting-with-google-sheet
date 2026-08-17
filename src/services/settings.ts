import type {
  AppSettings,
  CurrencyUnit,
  CustomForm,
  FieldConfig,
  SpreadsheetEntry,
} from '../types';
import { getItem, setItem, STORAGE_KEYS } from './storage';
import { isTokenValid } from './auth';

export const DEFAULT_INCOME_CATEGORIES = [
  'حقوق',
  'فروش',
  'سرمایه‌گذاری',
  'هدیه',
  'سایر',
];
export const DEFAULT_EXPENSE_CATEGORIES = [
  'خوراک',
  'حمل‌ونقل',
  'اجاره',
  'قبوض',
  'تفریح',
  'پوشاک',
  'سایر',
];

function incomeForm(): CustomForm {
  return {
    id: 'form_income',
    name: 'درآمد',
    sheetName: 'درآمد',
    type: 'income',
    fields: [
      { id: 'date', label: 'تاریخ', type: 'date', required: true },
      { id: 'title', label: 'عنوان', type: 'text', required: true },
      {
        id: 'category',
        label: 'دسته‌بندی',
        type: 'select',
        required: true,
        options: DEFAULT_INCOME_CATEGORIES,
      },
      { id: 'amount', label: 'مبلغ', type: 'number', required: true },
      { id: 'note', label: 'توضیحات', type: 'text', required: false },
    ],
  };
}

function expenseForm(): CustomForm {
  return {
    id: 'form_expense',
    name: 'هزینه',
    sheetName: 'هزینه',
    type: 'expense',
    fields: [
      { id: 'date', label: 'تاریخ', type: 'date', required: true },
      { id: 'title', label: 'عنوان', type: 'text', required: true },
      {
        id: 'category',
        label: 'دسته‌بندی',
        type: 'select',
        required: true,
        options: DEFAULT_EXPENSE_CATEGORIES,
      },
      { id: 'amount', label: 'مبلغ', type: 'number', required: true },
      { id: 'note', label: 'توضیحات', type: 'text', required: false },
    ],
  };
}

export function getDefaultForms(): CustomForm[] {
  return [incomeForm(), expenseForm()];
}

export function normalizeSettings(settings: AppSettings): AppSettings {
  if (settings.spreadsheets?.length) {
    const activeId =
      settings.spreadsheetId &&
      settings.spreadsheets.some((sheet) => sheet.id === settings.spreadsheetId)
        ? settings.spreadsheetId
        : settings.spreadsheets[0].id;

    return {
      ...settings,
      spreadsheetId: activeId,
      spreadsheets: settings.spreadsheets,
    };
  }

  if (settings.spreadsheetId) {
    return {
      ...settings,
      spreadsheets: [
        {
          id: settings.spreadsheetId,
          name: 'حسابداری اصلی',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  return {
    ...settings,
    spreadsheets: [],
  };
}

export function getSettings(): AppSettings | null {
  const raw = getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
  return raw ? normalizeSettings(raw) : null;
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, normalizeSettings(settings));
}

export function getDefaultSettings(): AppSettings {
  return {
    spreadsheetId: '',
    spreadsheets: [],
    forms: getDefaultForms(),
    currency: 'toman',
  };
}

export function getSpreadsheets(): SpreadsheetEntry[] {
  return getSettings()?.spreadsheets ?? [];
}

export function getActiveSpreadsheet(): SpreadsheetEntry | undefined {
  const settings = getSettings();
  if (!settings?.spreadsheetId) return undefined;
  return settings.spreadsheets?.find((sheet) => sheet.id === settings.spreadsheetId);
}

export function registerSpreadsheet(id: string, name: string): AppSettings {
  const settings = normalizeSettings(getSettings() ?? getDefaultSettings());
  const spreadsheets = settings.spreadsheets ?? [];
  const exists = spreadsheets.some((sheet) => sheet.id === id);
  const nextSpreadsheets = exists
    ? spreadsheets
    : [
        ...spreadsheets,
        {
          id,
          name: name.trim() || 'حسابداری',
          createdAt: new Date().toISOString(),
        },
      ];

  const updated = {
    ...settings,
    spreadsheetId: id,
    spreadsheets: nextSpreadsheets,
  };
  saveSettings(updated);
  return updated;
}

export function setActiveSpreadsheet(id: string): AppSettings {
  const settings = normalizeSettings(getSettings() ?? getDefaultSettings());
  if (!settings.spreadsheets?.some((sheet) => sheet.id === id)) {
    throw new Error('شیت انتخاب‌شده در لیست موجود نیست');
  }

  const updated = { ...settings, spreadsheetId: id };
  saveSettings(updated);
  return updated;
}

export function updateCurrency(currency: CurrencyUnit): void {
  const settings = getSettings() ?? getDefaultSettings();
  saveSettings({ ...settings, currency });
}

export function isConfigured(): boolean {
  const settings = getSettings();
  return !!(settings?.spreadsheetId && isTokenValid());
}

export function getFormById(formId: string): CustomForm | undefined {
  return getSettings()?.forms.find((f) => f.id === formId);
}

export function addCustomForm(name: string, fields: FieldConfig[]): CustomForm {
  const id = `form_${Date.now()}`;
  return {
    id,
    name,
    sheetName: name.slice(0, 30),
    type: 'custom',
    fields,
  };
}

export function updateFormCategories(
  formId: string,
  categories: string[]
): void {
  const settings = getSettings() ?? getDefaultSettings();
  const forms = settings.forms.map((form) => {
    if (form.id !== formId) return form;
    return {
      ...form,
      fields: form.fields.map((f) =>
        f.id === 'category' ? { ...f, options: categories } : f
      ),
    };
  });
  saveSettings({ ...settings, forms });
}
