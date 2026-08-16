import type { FieldConfig } from '../../types';
import { getTodayIso } from '../../utils/jalaliDate';

export function getInitialFieldValue(field: FieldConfig): string | number {
  if (field.type === 'date') return getTodayIso();
  if (field.type === 'number') return '';
  if (field.type === 'select' && field.options?.length) return field.options[0];
  return '';
}
