import {
  DANG_SPLIT_ALLOCATIONS_HEADERS,
  DANG_SPLIT_ALLOCATIONS_SHEET,
  DANG_SPLIT_CATEGORIES_HEADERS,
  DANG_SPLIT_CATEGORIES_SHEET,
  DANG_SPLIT_EXPENSES_HEADERS,
  DANG_SPLIT_EXPENSES_SHEET,
  DANG_SPLIT_PEOPLE_HEADERS,
  DANG_SPLIT_PEOPLE_SHEET,
  deleteDangSplitGroup,
  ensureDangSplitSheets,
  type DangSplitGroupWithRow
} from './dangSplit'
import {
  allocationToRow,
  expenseToRow,
  fetchDangSplitAllocations,
  fetchDangSplitExpenses,
  type DangSplitAllocationWithRow,
  type DangSplitExpenseWithRow
} from './dangSplitExpenses'
import {
  categoryToRow,
  fetchDangSplitCategories,
  fetchDangSplitPeople,
  personToRow,
  type DangSplitCategoryWithRow,
  type DangSplitPersonWithRow
} from './dangSplitPeople'
import { replaceSheetDataRows } from './sheets'

export interface DangSplitBundle {
  categories: DangSplitCategoryWithRow[]
  people: DangSplitPersonWithRow[]
  expenses: DangSplitExpenseWithRow[]
  allocations: DangSplitAllocationWithRow[]
}

/** همه داده‌های یک گروه با هم، تا ورود به گروه یک رفت‌وبرگشت باشد */
export async function fetchDangSplitBundle(
  spreadsheetId: string,
  groupId: string
): Promise<DangSplitBundle> {
  await ensureDangSplitSheets(spreadsheetId)

  const [categories, people, expenses, allocations] = await Promise.all([
    fetchDangSplitCategories(spreadsheetId, groupId),
    fetchDangSplitPeople(spreadsheetId, groupId),
    fetchDangSplitExpenses(spreadsheetId, groupId),
    fetchDangSplitAllocations(spreadsheetId, groupId)
  ])

  return { categories, people, expenses, allocations }
}

async function rewriteAllocations(
  spreadsheetId: string,
  keep: (item: DangSplitAllocationWithRow) => boolean
): Promise<void> {
  const existing = await fetchDangSplitAllocations(spreadsheetId)

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_ALLOCATIONS_SHEET,
    existing.filter(keep).map(allocationToRow),
    DANG_SPLIT_ALLOCATIONS_HEADERS.length,
    DANG_SPLIT_ALLOCATIONS_HEADERS
  )
}

/** حذف گروه با همه افراد، دسته‌ها، اقلام و تخصیص‌هایش */
export async function deleteDangSplitGroupCascade(
  spreadsheetId: string,
  group: DangSplitGroupWithRow
): Promise<void> {
  const [categories, people, expenses] = await Promise.all([
    fetchDangSplitCategories(spreadsheetId),
    fetchDangSplitPeople(spreadsheetId),
    fetchDangSplitExpenses(spreadsheetId)
  ])

  await rewriteAllocations(spreadsheetId, item => item.groupId !== group.id)

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_EXPENSES_SHEET,
    expenses.filter(item => item.groupId !== group.id).map(expenseToRow),
    DANG_SPLIT_EXPENSES_HEADERS.length,
    DANG_SPLIT_EXPENSES_HEADERS
  )

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_PEOPLE_SHEET,
    people.filter(item => item.groupId !== group.id).map(personToRow),
    DANG_SPLIT_PEOPLE_HEADERS.length,
    DANG_SPLIT_PEOPLE_HEADERS
  )

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_CATEGORIES_SHEET,
    categories.filter(item => item.groupId !== group.id).map(categoryToRow),
    DANG_SPLIT_CATEGORIES_HEADERS.length,
    DANG_SPLIT_CATEGORIES_HEADERS
  )

  await deleteDangSplitGroup(spreadsheetId, group.rowNumber)
}

/** حذف یک قلم هزینه با تخصیص‌هایش */
export async function deleteDangSplitExpenseCascade(
  spreadsheetId: string,
  expense: DangSplitExpenseWithRow
): Promise<void> {
  await rewriteAllocations(spreadsheetId, item => item.expenseId !== expense.id)

  const expenses = await fetchDangSplitExpenses(spreadsheetId)

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_EXPENSES_SHEET,
    expenses.filter(item => item.id !== expense.id).map(expenseToRow),
    DANG_SPLIT_EXPENSES_HEADERS.length,
    DANG_SPLIT_EXPENSES_HEADERS
  )
}

/** حذف یک فرد با تخصیص‌هایش */
export async function deleteDangSplitPersonCascade(
  spreadsheetId: string,
  person: DangSplitPersonWithRow
): Promise<void> {
  await rewriteAllocations(spreadsheetId, item => item.personId !== person.id)

  const people = await fetchDangSplitPeople(spreadsheetId)

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_PEOPLE_SHEET,
    people.filter(item => item.id !== person.id).map(personToRow),
    DANG_SPLIT_PEOPLE_HEADERS.length,
    DANG_SPLIT_PEOPLE_HEADERS
  )
}

/** حذف یک دسته: افراد آن دسته بی‌دسته می‌شوند، حذف نمی‌شوند */
export async function deleteDangSplitCategoryCascade(
  spreadsheetId: string,
  category: DangSplitCategoryWithRow
): Promise<void> {
  const [categories, people] = await Promise.all([
    fetchDangSplitCategories(spreadsheetId),
    fetchDangSplitPeople(spreadsheetId)
  ])

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_PEOPLE_SHEET,
    people
      .map(item => (item.categoryId === category.id ? { ...item, categoryId: '' } : item))
      .map(personToRow),
    DANG_SPLIT_PEOPLE_HEADERS.length,
    DANG_SPLIT_PEOPLE_HEADERS
  )

  await replaceSheetDataRows(
    spreadsheetId,
    DANG_SPLIT_CATEGORIES_SHEET,
    categories.filter(item => item.id !== category.id).map(categoryToRow),
    DANG_SPLIT_CATEGORIES_HEADERS.length,
    DANG_SPLIT_CATEGORIES_HEADERS
  )
}
