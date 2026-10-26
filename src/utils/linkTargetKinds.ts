import { RECEIVABLE_INCOME_CATEGORY } from './protectedCategories'
import { CHECK_EXPENSE_CATEGORY, CHECK_INCOME_CATEGORY } from '../services/checks'
import { DANG_EXPENSE_CATEGORY } from '../services/dangConstants'
import { INSTALLMENT_EXPENSE_CATEGORY } from '../services/installmentsConstants'
import { isPersonalWorkspace } from '../services/workspace'

export type LinkTargetKindId = 'dang' | 'receivable' | 'checkPaid' | 'checkReceived' | 'installment'

/**
 * How the record's amount meets the picked item:
 * - `cap`: the item takes any amount up to what is left (a debt, a receivable);
 * - `exact`: the item has a fixed amount and the record must equal it (a check);
 * - `warn`: any amount is allowed and a different one is only flagged (an installment: banks add fees).
 */
export type LinkAmountFit = 'cap' | 'exact' | 'warn'

/**
 * What a record can be linked to: the record's type and category that trigger the picker, and the
 * Persian copy around it. A new kind adds one row here and one handler in `services/linkPayment.ts`;
 * the entry form and the SMS card pick it up with no change.
 */
export interface LinkTargetKind {
  id: LinkTargetKindId
  recordType: 'expense' | 'income'
  category: string
  /** Label of the select. */
  fieldLabel: string
  /** The always-available answer: the record stays a plain one. */
  noneLabel: string
  /** Shown instead of the select while nothing is open. */
  emptyHint: string
  /** The thing that fails to be registered: «پرداخت بدهی» / «دریافت طلب». */
  failureNoun: string
  /** Where the user links the record by hand afterwards. */
  page: string
  /** «بدهی» / «طلب» / «چک» / «قسط», for the messages. */
  noun: string
  fit: LinkAmountFit
  /** Label of the second select, for items that have children (the instalments of a book). */
  childLabel?: string
  /** Added to the «link it by hand» advice when the page cannot find the record by itself. */
  manualHint?: string
}

const KINDS: LinkTargetKind[] = [
  {
    id: 'dang',
    recordType: 'expense',
    category: DANG_EXPENSE_CATEGORY,
    fieldLabel: 'پرداخت کدام بدهی؟',
    noneLabel: 'هیچ‌کدوم',
    emptyHint: 'بدهی بازی برای وصل کردن نیست؛ این رکورد یک هزینهٔ معمولی ثبت می‌شود.',
    failureNoun: 'پرداخت بدهی',
    page: 'بدهی',
    noun: 'بدهی',
    fit: 'cap'
  },
  {
    id: 'receivable',
    recordType: 'income',
    category: RECEIVABLE_INCOME_CATEGORY,
    fieldLabel: 'دریافت کدام طلب؟',
    noneLabel: 'هیچ‌کدوم',
    emptyHint: 'طلب بازی برای وصل کردن نیست؛ این رکورد یک درآمد معمولی ثبت می‌شود.',
    failureNoun: 'دریافت طلب',
    page: 'طلب‌ها',
    noun: 'طلب',
    fit: 'cap'
  },
  {
    id: 'checkPaid',
    recordType: 'expense',
    category: CHECK_EXPENSE_CATEGORY,
    fieldLabel: 'کدام چک پرداختی پاس شد؟',
    noneLabel: 'هیچ‌کدوم',
    emptyHint: 'چک پرداختیِ بازی برای وصل کردن نیست؛ این رکورد یک هزینهٔ معمولی ثبت می‌شود.',
    failureNoun: 'پاس شدن چک',
    page: 'چک‌ها',
    noun: 'چک',
    fit: 'exact'
  },
  {
    id: 'checkReceived',
    recordType: 'income',
    category: CHECK_INCOME_CATEGORY,
    fieldLabel: 'کدام چک دریافتی پاس شد؟',
    noneLabel: 'هیچ‌کدوم',
    emptyHint: 'چک دریافتیِ بازی برای وصل کردن نیست؛ این رکورد یک درآمد معمولی ثبت می‌شود.',
    failureNoun: 'پاس شدن چک',
    page: 'چک‌ها',
    noun: 'چک',
    fit: 'exact'
  },
  {
    id: 'installment',
    recordType: 'expense',
    category: INSTALLMENT_EXPENSE_CATEGORY,
    fieldLabel: 'پرداخت کدام دفترچه قسط؟',
    childLabel: 'کدام قسط؟',
    noneLabel: 'هیچ‌کدوم',
    emptyHint: 'قسط پرداخت‌نشده‌ای برای وصل کردن نیست؛ این رکورد یک هزینهٔ معمولی ثبت می‌شود.',
    failureNoun: 'پرداخت قسط',
    manualHint:
      'اگر مبلغ قسط با مبلغ رکورد فرق دارد، آن صفحه رکورد را پیدا نمی‌کند؛ رکورد را از «رکوردها» پاک کن و قسط را از همان صفحه پرداخت کن.',
    page: 'اقساط',
    noun: 'قسط',
    fit: 'warn'
  }
]

/**
 * The kind a new record of this type and category can be linked to, or null. Only the personal
 * books link (a building and a shared account keep their own payment flows).
 */
export function linkTargetKindFor(type: string, category: string): LinkTargetKind | null {
  if (!isPersonalWorkspace()) return null

  const name = category.trim()

  return KINDS.find(kind => kind.recordType === type && kind.category === name) ?? null
}

/** True when saving this record quietly would skip the question «کدام بدهی/طلب/چک/قسط؟» (quick SMS save). */
export const isLinkTargetCategory = (type: string, category: string): boolean =>
  linkTargetKindFor(type, category) !== null
