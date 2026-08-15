import type { AppSettings, FieldConfig } from '../types';
import { getItem, setItem, STORAGE_KEYS } from './storage';
import { isTokenValid } from './auth';

const DEFAULT_FIELDS: FieldConfig[] = [
  { id: 'date', label: 'تاریخ', type: 'date', required: true },
  { id: 'title', label: 'عنوان', type: 'text', required: true },
  { id: 'amount', label: 'مبلغ', type: 'number', required: true },
  {
    id: 'type',
    label: 'نوع',
    type: 'select',
    required: true,
    options: ['درآمد', 'هزینه'],
  },
  { id: 'note', label: 'توضیحات', type: 'text', required: false },
];

export function getSettings(): AppSettings | null {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function getDefaultSettings(): AppSettings {
  return {
    sheetId: '',
    sheetName: 'حسابداری',
    fields: DEFAULT_FIELDS,
  };
}

export function isConfigured(): boolean {
  const settings = getSettings();
  return !!(settings?.sheetId && isTokenValid());
}
