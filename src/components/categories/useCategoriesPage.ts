import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useCategoryActions } from './useCategoryActions'
import { useCategoryBudgets } from '../../hooks/useCategoryBudgets'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { isDefaultsOfferClosed, missingDefaultCategories } from '../../services/categoryDefaults'
import { readCategoryList, readSubcategoryList } from '../../services/categoryManage'
import {
  isDormantCategory,
  isFixedCategory,
  summarizeCategoryUsage,
  usageOf,
  type CategoryUsage,
  type CategoryUsageSummary,
  type ManagedCategoryType
} from '../../services/categoryManagePlan'
import { loadCategoryRows } from '../../services/categoryRewrite'
import { getSettings } from '../../services/settings'
import { isOtherCategory } from '../../utils/categoryOrdering'
import { getTodayIso } from '../../utils/jalaliDate'
import { isSystemCategory } from '../../utils/protectedCategories'
import { matchSearch } from '../../utils/search'

export type CategorySegment = 'expense' | 'income' | 'other'

export type OtherListType = Extract<ManagedCategoryType, 'dang' | 'receivable' | 'personalReminder'>

export const OTHER_LISTS: { id: OtherListType; label: string }[] = [
  { id: 'dang', label: 'بدهی' },
  { id: 'receivable', label: 'طلب' },
  { id: 'personalReminder', label: 'یادآوری شخصی' }
]

export interface CategoryItem {
  name: string
  index: number
  /** Subcategories without the implicit «سایر»; null for lists without them. */
  subcategories: string[] | null
  usage: CategoryUsage
  budget: number
  /** «سیستمی» badge: no rename, no delete. */
  system: boolean
  /** «سیستمی» or «سایر»: name and existence are fixed. */
  fixed: boolean
  dormant: boolean
}

const EMPTY_SUMMARY: CategoryUsageSummary = { byCategory: new Map(), hasOlderHistory: false }

function hasSubcategories(type: ManagedCategoryType): boolean {
  return type === 'income' || type === 'expense'
}

/** Lists, usage counts, budgets and the open category of the «دسته‌ها» page. */
export function useCategoriesPage() {
  const [searchParams] = useSearchParams()
  const [segment, setSegment] = useState<CategorySegment>(() =>
    searchParams.get('type') === 'income' ? 'income' : 'expense'
  )
  const [otherType, setOtherType] = useState<OtherListType>('dang')
  const type: ManagedCategoryType = segment === 'other' ? otherType : segment
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [summary, setSummary] = useState<CategoryUsageSummary>(EMPTY_SUMMARY)
  const [selected, setSelected] = useState<string | null>(null)
  const spreadsheetId = getSettings()?.spreadsheetId ?? ''
  const [offerClosed, setOfferClosed] = useState(() => isDefaultsOfferClosed(spreadsheetId))
  const revision = useDataRefresh()
  const actions = useCategoryActions(spreadsheetId, type)
  const { busy } = actions
  const budgetState = useCategoryBudgets(type === 'expense')

  // A rename rewrites rows one by one: reload once it is over, not after every row.
  useEffect(() => {
    if (busy) return

    let live = true

    setCategories(readCategoryList(type))
    if (!spreadsheetId) return

    void loadCategoryRows(spreadsheetId, type)
      .then(rows => live && setSummary(summarizeCategoryUsage(rows, getTodayIso())))
      .catch(() => live && setSummary(EMPTY_SUMMARY))

    return () => {
      live = false
    }
  }, [busy, revision, spreadsheetId, type])

  const items = useMemo<CategoryItem[]>(
    () =>
      categories.map((name, index) => ({
        name,
        index,
        subcategories: hasSubcategories(type)
          ? readSubcategoryList(type, name).filter(sub => !isOtherCategory(sub))
          : null,
        usage: usageOf(summary, name),
        budget: type === 'expense' ? budgetState.budgets.get(name) ?? 0 : 0,
        system: isSystemCategory(type, name),
        fixed: isFixedCategory(type, name),
        dormant: isDormantCategory(type, name, summary)
      })),
    // `revision` re-reads the subcategories after an edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budgetState.budgets, categories, summary, type, revision]
  )

  const visibleItems = useMemo(
    () => (query.trim() ? items.filter(item => matchSearch(query, item.name)) : items),
    [items, query]
  )

  const missingDefaults = useMemo(
    () =>
      offerClosed || segment === 'other'
        ? []
        : [
            ...missingDefaultCategories('expense', readCategoryList('expense')),
            ...missingDefaultCategories('income', readCategoryList('income'))
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [offerClosed, segment, revision]
  )

  return {
    segment,
    setSegment: (next: CategorySegment) => {
      setSegment(next)
      setQuery('')
    },
    otherType,
    setOtherType,
    type,
    query,
    setQuery,
    items,
    visibleItems,
    selectedItem: items.find(item => item.name === selected) ?? null,
    openCategory: setSelected,
    closeCategory: () => setSelected(null),
    missingDefaults,
    closeOffer: () => setOfferClosed(true),
    budgetState,
    actions
  }
}
