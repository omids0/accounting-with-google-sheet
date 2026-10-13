import { formatAmountWords } from '../utils/insightText'
import { toPersianDigits } from '../utils/normalizeDigits'

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'pay'
  | 'unpay'
  | 'budget'
  | 'category'
  | 'reconcile'
  | 'recurring'
  | 'goal'

export type ActivityModule =
  | 'records'
  | 'checks'
  | 'installments'
  | 'dang'
  | 'receivables'
  | 'budgets'
  | 'categories'
  | 'wallet'
  | 'recurring'
  | 'goals'
  | 'sync'

/** Filter chips and the desktop table name the module in Persian. */
export const ACTIVITY_MODULE_LABELS: Record<ActivityModule, string> = {
  records: 'تراکنش‌ها',
  checks: 'چک‌ها',
  installments: 'اقساط',
  dang: 'بدهی',
  receivables: 'طلب‌ها',
  budgets: 'بودجه',
  categories: 'دسته‌ها',
  wallet: 'کیف پول',
  recurring: 'تکرارها',
  goals: 'اهداف',
  sync: 'همگام‌سازی'
}

export interface ActivitySummaryExtra {
  /** Bulk actions: how many items one call covered. */
  count?: number
  /** Budget limit, goal deposit (< 0 for a withdrawal). */
  amount?: number
  /** Category actions: what happened, and the new name of a rename. */
  kind?: 'add' | 'rename' | 'merge' | 'delete'
  to?: string
}

const quoted = (title: string) => `«${title.trim() || '—'}»`

const countOf = (count: number) => toPersianDigits(String(count))

function categorySummary(title: string, extra: ActivitySummaryExtra): string {
  if (extra.kind === 'rename')
    return `دستهٔ ${quoted(title)} را به ${quoted(extra.to ?? '')} تغییر داد`
  if (extra.kind === 'merge')
    return `دستهٔ ${quoted(title)} را در ${quoted(extra.to ?? '')} ادغام کرد`
  if (extra.kind === 'delete') return `دستهٔ ${quoted(title)} را حذف کرد`

  return `دستهٔ ${quoted(title)} را اضافه کرد`
}

/**
 * The Persian line the activity feed shows after the person's name, e.g.
 * «تعمیر یخچال» را ثبت کرد / قسط مهر وام مسکن را پرداخت‌شده زد /
 * بودجهٔ «خوراک» را به ۹۰۰ هزار تغییر داد. `module` stays in the signature for
 * lines that will need it; today the title already names the item.
 */
export function summaryFor(
  action: ActivityAction,
  _module: string,
  title: string,
  extra: ActivitySummaryExtra = {}
): string {
  const many = (extra.count ?? 1) > 1

  switch (action) {
    case 'create':
      return many ? `${countOf(extra.count ?? 0)} مورد را ثبت کرد` : `${quoted(title)} را ثبت کرد`
    case 'update':
      return `${quoted(title)} را ویرایش کرد`
    case 'delete':
      return many ? `${countOf(extra.count ?? 0)} مورد را حذف کرد` : `${quoted(title)} را حذف کرد`
    case 'pay':
      return `${title.trim()} را پرداخت‌شده زد`
    case 'unpay':
      return `${title.trim()} را پرداخت‌نشده کرد`
    case 'budget':
      return extra.amount
        ? `بودجهٔ ${quoted(title)} را به ${formatAmountWords(extra.amount)} تغییر داد`
        : `بودجهٔ ${quoted(title)} را برداشت`
    case 'category':
      return categorySummary(title, extra)
    case 'reconcile':
      return `موجودی ${quoted(title)} را با پیامک‌ها تطبیق داد`
    case 'recurring':
      return many
        ? `${countOf(extra.count ?? 0)} تکرار ماهانه را ثبت کرد`
        : `${quoted(title)} را از تکرارها ثبت کرد`
    case 'goal':
      return (extra.amount ?? 0) < 0
        ? `${formatAmountWords(extra.amount ?? 0)} از هدف ${quoted(title)} برداشت`
        : `${formatAmountWords(extra.amount ?? 0)} به هدف ${quoted(title)} واریز کرد`
    default:
      return title
  }
}

/** A record's name in the feed: its title, else its category. */
export function recordActivityTitle(values: Record<string, unknown>): string {
  return String(values.title || values.category || '').trim()
}

/** «من … زدم»: the signed-in person's own lines read in first person. */
export function firstPersonSummary(summary: string): string {
  return /(کرد|زد|داد|برداشت)$/.test(summary) ? `${summary}م` : summary
}
