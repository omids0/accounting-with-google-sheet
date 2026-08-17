import type { FieldConfig } from '../../types';
import { getTodayIso } from '../../utils/jalaliDate';

const STANDARD_FIELD_ORDER = ['date', 'title', 'category', 'amount', 'note'];

export function sortFormFields(fields: FieldConfig[]): FieldConfig[] {
  const order = new Map(STANDARD_FIELD_ORDER.map((id, index) => [id, index]));

  return [...fields].sort((a, b) => {
    const aIndex = order.get(a.id) ?? 1000;
    const bIndex = order.get(b.id) ?? 1000;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return 0;
  });
}

export function getInitialFieldValue(field: FieldConfig): string | number {
  if (field.type === 'date') return getTodayIso();
  if (field.type === 'number') return '';
  if (field.type === 'select' && field.options?.length) return field.options[0];
  return '';
}
