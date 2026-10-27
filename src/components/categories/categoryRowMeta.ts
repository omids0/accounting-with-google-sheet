import type { CategoryItem } from './useCategoriesPage'
import type { ManagedCategoryType } from '../../services/categoryManagePlan'
import { formatPersianNumber } from '../../utils/formatMoney'

/** What each «سیستمی» category is wired to, shown in place of an empty line. */
const SYSTEM_NOTES: Record<string, string> = {
  خودرو: 'به سرویس خودرو وصل است',
  قسط: 'به اقساط وصل است',
  چک: 'به چک‌ها وصل است',
  بدهی: 'برای پرداخت بدهی‌ها',
  انتقال: 'بین حساب‌ها و به هدف',
  'اصلاح موجودی': 'به تطبیق موجودی وصل است',
  طلب: 'به طلب‌ها وصل است'
}

const n = (value: number) => formatPersianNumber(value)

/** «۴ زیردسته · ۳۱ تراکنش این ماه · بودجه ۸۰۰٬۰۰۰», or «۲ مورد» for the other lists. */
export function categoryRowMeta(item: CategoryItem, type: ManagedCategoryType): string {
  if (type !== 'income' && type !== 'expense') return `${n(item.usage.total)} مورد`

  const parts: string[] = []

  if (item.system && SYSTEM_NOTES[item.name]) parts.push(SYSTEM_NOTES[item.name])
  if (item.subcategories?.length) parts.push(`${n(item.subcategories.length)} زیردسته`)
  parts.push(item.dormant ? '۰ تراکنش در ۶ ماه' : `${n(item.usage.thisMonth)} تراکنش این ماه`)
  if (item.budget > 0) parts.push(`بودجه ${n(item.budget)}`)

  return parts.join(' · ')
}
