import { RECEIVABLE_INCOME_CATEGORY } from './protectedCategories'
import { DANG_EXPENSE_CATEGORY } from '../services/dangConstants'
import { isPersonalWorkspace } from '../services/workspace'

export type LinkTargetKindId = 'dang' | 'receivable'

/**
 * What a record can be linked to: the record's type and category that trigger the picker, and the
 * Persian copy around it. A new kind (checks, installments) adds one row here and one handler in
 * `services/linkPayment.ts`; the entry form and the SMS card pick it up with no change.
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
  /** «بدهی» / «طلب», for the over-remaining message. */
  noun: string
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
    noun: 'بدهی'
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
    noun: 'طلب'
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

/** True when saving this record quietly would skip the question «کدام بدهی/طلب؟» (bulk SMS save). */
export const isLinkTargetCategory = (type: string, category: string): boolean =>
  linkTargetKindFor(type, category) !== null
