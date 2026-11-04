import type { Tab } from '../components/layout/types'

/** The pages of the parents feature (see `layout/childTabs.ts`), one path per tab. */
export const CHILD_TAB_PATHS: Partial<Record<Tab, string>> = {
  'child-home': '/child',
  'child-records': '/child/records',
  'child-categories': '/child/categories',
  'children-home': '/children',
  'parents-home': '/parents'
}

/** The child's record list, optionally opened on one category (`?category=`). */
export const CHILD_CATEGORY_PARAM = 'category'

/** With `category`: the Jalali month (`YYYY-MM`) and the kind the card was showing. */
export const CHILD_MONTH_PARAM = 'month'

export const CHILD_KIND_PARAM = 'kind'

export interface ChildRecordsView {
  /** Jalali `YYYY-MM`. */
  month?: string
  kind?: 'income' | 'expense'
}

/**
 * The records of one category. A category card shows one month of one kind, so the link carries
 * both: the list then adds up to the very number the card showed.
 */
export function childRecordsPath(category?: string, view: ChildRecordsView = {}): string {
  const base = CHILD_TAB_PATHS['child-records'] ?? '/child/records'

  if (!category) return base

  const query = new URLSearchParams({ [CHILD_CATEGORY_PARAM]: category })

  if (view.month) query.set(CHILD_MONTH_PARAM, view.month)
  if (view.kind) query.set(CHILD_KIND_PARAM, view.kind)

  return `${base}?${query.toString()}`
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

/** What a records link asks for; a malformed `month` or `kind` is ignored. */
export function parseChildRecordsParams(params: URLSearchParams): {
  category: string
  month: string | null
  kind: 'income' | 'expense' | null
} {
  const month = params.get(CHILD_MONTH_PARAM) ?? ''
  const kind = params.get(CHILD_KIND_PARAM)

  return {
    category: params.get(CHILD_CATEGORY_PARAM) ?? '',
    month: MONTH_PATTERN.test(month) ? month : null,
    kind: kind === 'income' || kind === 'expense' ? kind : null
  }
}
