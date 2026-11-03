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

export function childRecordsPath(category?: string): string {
  const base = CHILD_TAB_PATHS['child-records'] ?? '/child/records'

  return category ? `${base}?${CHILD_CATEGORY_PARAM}=${encodeURIComponent(category)}` : base
}
