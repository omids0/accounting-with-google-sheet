import type { EntryTemplate } from '../../services/entryTemplates'
import { formatMoney } from '../../utils/formatMoney'

/** «قبوض › برق» */
export function templateLabel(template: Pick<EntryTemplate, 'category' | 'subCategory'>): string {
  return template.subCategory ? `${template.category} › ${template.subCategory}` : template.category
}

/** The chip's tiny line: «ملت · ۲۵۰٬۰۰۰ تومان». */
export function templateMeta(template: EntryTemplate, accountTitle: string): string {
  return [accountTitle, template.amount > 0 ? formatMoney(template.amount) : '']
    .filter(Boolean)
    .join(' · ')
}
