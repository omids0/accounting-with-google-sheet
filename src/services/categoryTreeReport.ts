import { getSettings } from './settings'
import { fetchRecords } from './sheets'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'
import type { CustomForm } from '../types'
import { isOtherCategory, OTHER_CATEGORY } from '../utils/categoryOrdering'
import { isDateInRange } from '../utils/dateRange'
import type { DateRange } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

export type CategoryTreeType = 'income' | 'expense'

export interface CategoryTreeEntry {
  type: CategoryTreeType
  category: string
  subCategory: string
  amount: number
}

export interface CategoryTreeChild {
  name: string
  total: number
  count: number
}

export interface CategoryTreeNode {
  id: string
  type: CategoryTreeType
  category: string
  total: number
  count: number
  children: CategoryTreeChild[]
}

export interface CategoryTreeData {
  nodes: CategoryTreeNode[]
  incomeTotal: number
  expenseTotal: number
}

/** Biggest first, with the «سایر» catch-all always at the bottom. */
function byTotalWithOtherLast<T extends { total: number }>(
  nameOf: (item: T) => string
): (a: T, b: T) => number {
  return (a, b) => {
    const aOther = isOtherCategory(nameOf(a))
    const bOther = isOtherCategory(nameOf(b))

    if (aOther !== bOther) return aOther ? 1 : -1

    return b.total - a.total
  }
}

export function buildCategoryTree(entries: CategoryTreeEntry[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>()

  for (const entry of entries) {
    const category = entry.category.trim() || OTHER_CATEGORY

    const subCategory = entry.subCategory.trim() || OTHER_CATEGORY

    const id = `${entry.type}:${category}`

    const node = nodes.get(id) ?? {
      id,
      type: entry.type,
      category,
      total: 0,
      count: 0,
      children: [] as CategoryTreeChild[]
    }

    node.total += entry.amount
    node.count += 1

    const child = node.children.find(item => item.name === subCategory)

    if (child) {
      child.total += entry.amount
      child.count += 1
    } else {
      node.children.push({ name: subCategory, total: entry.amount, count: 1 })
    }

    nodes.set(id, node)
  }

  const sortChildren = byTotalWithOtherLast<CategoryTreeChild>(child => child.name)

  return [...nodes.values()]
    .map(node => ({ ...node, children: [...node.children].sort(sortChildren) }))
    .sort(byTotalWithOtherLast<CategoryTreeNode>(node => node.category))
}

export function sumCategoryTree(nodes: CategoryTreeNode[], type: CategoryTreeType): number {
  return nodes.filter(node => node.type === type).reduce((sum, node) => sum + node.total, 0)
}

function dateFieldId(form: CustomForm): string {
  return form.fields.find(field => field.type === 'date')?.id ?? 'date'
}

function recordsToEntries(
  form: CustomForm & { type: CategoryTreeType },
  records: { values: Record<string, string> }[],
  range: DateRange
): CategoryTreeEntry[] {
  const dateField = dateFieldId(form)

  return records
    .filter(record => isDateInRange(record.values[dateField] ?? '', range))
    .map(record => ({
      type: form.type,
      category: record.values.category ?? '',
      subCategory: record.values[SUBCATEGORY_FIELD_ID] ?? '',
      amount: parseNumeric(record.values.amount)
    }))
}

export async function loadCategoryTreeReport(
  spreadsheetId: string,
  range: DateRange
): Promise<CategoryTreeData> {
  const forms = (getSettings()?.forms ?? []).filter(
    (form): form is CustomForm & { type: CategoryTreeType } =>
      form.type === 'income' || form.type === 'expense'
  )

  const batches = await Promise.all(
    forms.map(async form => recordsToEntries(form, await fetchRecords(spreadsheetId, form), range))
  )

  const nodes = buildCategoryTree(batches.flat())

  return {
    nodes,
    incomeTotal: sumCategoryTree(nodes, 'income'),
    expenseTotal: sumCategoryTree(nodes, 'expense')
  }
}
