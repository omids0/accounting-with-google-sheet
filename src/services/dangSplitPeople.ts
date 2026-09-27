import {
  DANG_SPLIT_CATEGORIES_SHEET,
  DANG_SPLIT_PEOPLE_HEADERS,
  DANG_SPLIT_PEOPLE_SHEET,
  mapSheetRows,
  nowTimestamp,
  repairDangSplitHeaders
} from './dangSplit'
import { appendSheetRow, deleteSheetRow, fetchSheetRows, updateSheetRow } from './sheets'
import type { DangSplitPerson, DangSplitPersonCategory } from '../types/dangSplit'
import { parseNumeric } from '../utils/parseNumeric'

export type DangSplitPersonWithRow = DangSplitPerson & { rowNumber: number }
export type DangSplitCategoryWithRow = DangSplitPersonCategory & { rowNumber: number }

function rowToCategory(row: string[], rowNumber: number): DangSplitCategoryWithRow {
  return {
    rowNumber,
    id: row[0] ?? '',
    groupId: row[1] ?? '',
    title: row[2] ?? '',
    createdAt: row[3] ?? ''
  }
}

export function categoryToRow(category: DangSplitPersonCategory): string[] {
  return [category.id, category.groupId, category.title, category.createdAt]
}

function rowToPerson(row: string[], rowNumber: number): DangSplitPersonWithRow {
  return {
    rowNumber,
    id: row[0] ?? '',
    groupId: row[1] ?? '',
    name: row[2] ?? '',
    categoryId: row[3] ?? '',
    defaultWeight: parseNumeric(row[4]) || 1,
    paidAmount: parseNumeric(row[5]),
    settledAt: row[6] ?? '',
    note: row[7] ?? '',
    deposit: parseNumeric(row[8])
  }
}

export function personToRow(person: DangSplitPerson): string[] {
  return [
    person.id,
    person.groupId,
    person.name,
    person.categoryId,
    String(person.defaultWeight),
    String(person.paidAmount),
    person.settledAt,
    person.note,
    String(person.deposit)
  ]
}

export async function fetchDangSplitCategories(
  spreadsheetId: string,
  groupId?: string
): Promise<DangSplitCategoryWithRow[]> {
  const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_CATEGORIES_SHEET)

  return mapSheetRows(rows, rowToCategory)
    .filter(item => !groupId || item.groupId === groupId)
    .sort((a, b) => a.title.localeCompare(b.title, 'fa'))
}

export async function createDangSplitCategory(
  spreadsheetId: string,
  data: { groupId: string; title: string }
): Promise<DangSplitPersonCategory> {
  const category: DangSplitPersonCategory = {
    id: crypto.randomUUID(),
    groupId: data.groupId,
    title: data.title,
    createdAt: nowTimestamp()
  }

  await appendSheetRow(spreadsheetId, DANG_SPLIT_CATEGORIES_SHEET, categoryToRow(category))

  return category
}

export async function updateDangSplitCategory(
  spreadsheetId: string,
  rowNumber: number,
  category: DangSplitPersonCategory
): Promise<void> {
  await updateSheetRow(
    spreadsheetId,
    DANG_SPLIT_CATEGORIES_SHEET,
    rowNumber,
    categoryToRow(category)
  )
}

export async function deleteDangSplitCategory(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, DANG_SPLIT_CATEGORIES_SHEET, rowNumber)
}

export async function fetchDangSplitPeople(
  spreadsheetId: string,
  groupId?: string
): Promise<DangSplitPersonWithRow[]> {
  await repairDangSplitHeaders(
    spreadsheetId,
    DANG_SPLIT_PEOPLE_SHEET,
    DANG_SPLIT_PEOPLE_HEADERS,
    rows => mapSheetRows(rows, rowToPerson).map(personToRow)
  )

  const rows = await fetchSheetRows(spreadsheetId, DANG_SPLIT_PEOPLE_SHEET)

  return mapSheetRows(rows, rowToPerson)
    .filter(item => !groupId || item.groupId === groupId)
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'))
}

export async function createDangSplitPerson(
  spreadsheetId: string,
  data: {
    groupId: string
    name: string
    categoryId: string
    defaultWeight: number
    deposit: number
    note: string
  }
): Promise<DangSplitPerson> {
  const person: DangSplitPerson = {
    id: crypto.randomUUID(),
    groupId: data.groupId,
    name: data.name,
    categoryId: data.categoryId,
    defaultWeight: data.defaultWeight,
    deposit: data.deposit,
    paidAmount: 0,
    settledAt: '',
    note: data.note
  }

  await appendSheetRow(spreadsheetId, DANG_SPLIT_PEOPLE_SHEET, personToRow(person))

  return person
}

export async function updateDangSplitPerson(
  spreadsheetId: string,
  rowNumber: number,
  person: DangSplitPerson
): Promise<void> {
  await updateSheetRow(spreadsheetId, DANG_SPLIT_PEOPLE_SHEET, rowNumber, personToRow(person))
}

export async function deleteDangSplitPerson(
  spreadsheetId: string,
  rowNumber: number
): Promise<void> {
  await deleteSheetRow(spreadsheetId, DANG_SPLIT_PEOPLE_SHEET, rowNumber)
}

/** شارژ صندوق: مبلغ جدید به واریز قبلی این فرد اضافه می‌شود */
export async function addDangSplitPersonDeposit(
  spreadsheetId: string,
  person: DangSplitPersonWithRow,
  amount: number
): Promise<DangSplitPerson> {
  const updated: DangSplitPerson = {
    ...person,
    deposit: person.deposit + amount
  }

  await updateDangSplitPerson(spreadsheetId, person.rowNumber, updated)

  return updated
}

/**
 * ثبت تسویه نقدی یک فرد. مقدار منفی یعنی پولش را پس گرفته (طلبکار بوده). `due` سهم
 * منهای بستانکاری است؛ زمان تسویه وقتی پرداخت به آن رسید پر و در غیر این صورت پاک می‌شود.
 */
export async function setDangSplitPersonPaid(
  spreadsheetId: string,
  person: DangSplitPersonWithRow,
  paidAmount: number,
  due: number
): Promise<DangSplitPerson> {
  const paid = paidAmount
  const settled = due === 0 ? paid === 0 : due > 0 ? paid >= due : paid <= due
  const updated: DangSplitPerson = {
    ...person,
    paidAmount: paid,
    settledAt: settled ? person.settledAt || nowTimestamp() : ''
  }

  await updateDangSplitPerson(spreadsheetId, person.rowNumber, updated)

  return updated
}
