import type { AppSettings, CurrencyUnit, CustomForm, FieldConfig } from '../types';
import { getItem, setItem, STORAGE_KEYS } from './storage';
import { isTokenValid } from './auth';

const INCOME_CATEGORIES = ['حقوق', 'فروش', 'سرمایه‌گذاری', 'هدیه', 'سایر'];
const EXPENSE_CATEGORIES = ['خوراک', 'حمل‌ونقل', 'اجاره', 'قبوض', 'تفریح', 'پوشاک', 'سایر'];

function incomeForm(): CustomForm {
  return {
    id: 'form_income',
    name: 'درآمد',
    sheetName: 'درآمد',
    type: 'income',
    fields: [
      { id: 'date', label: 'تاریخ', type: 'date', required: true },
      { id: 'title', label: 'عنوان', type: 'text', required: true },
      { id: 'amount', label: 'مبلغ', type: 'number', required: true },
      {
        id: 'category',
        label: 'دسته‌بندی',
        type: 'select',
        required: true,
        options: INCOME_CATEGORIES,
      },
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
      { id: 'amount', label: 'مبلغ', type: 'number', required: true },
      {
        id: 'category',
        label: 'دسته‌بندی',
        type: 'select',
        required: true,
        options: EXPENSE_CATEGORIES,
      },
      { id: 'note', label: 'توضیحات', type: 'text', required: false },
    ],
  };
}

export function getDefaultForms(): CustomForm[] {
  return [incomeForm(), expenseForm()];
}

export function getSettings(): AppSettings | null {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function getDefaultSettings(): AppSettings {
  return {
    spreadsheetId: '',
    forms: getDefaultForms(),
    currency: 'toman',
  };
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
