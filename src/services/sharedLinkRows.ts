import { getDefaultForms } from './settings'
import { buildHeaders, normalizeHeaderLabel } from './sheetsHeaders'
import type { OutboxOperation } from './syncOutbox'
import { withStandardFields } from '../components/form/fieldUtils'
import {
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_REF_FIELD_ID,
  SHARED_REF_FIELD_LABEL,
  SHARED_SPLIT_FIELD_ID,
  type SharedSplit
} from '../components/form/sharedFields'
import type { CustomForm } from '../types'
import { SETTLEMENT_CATEGORY } from '../utils/protectedCategories'
import { headerWriterColumn, withWriterCell } from '../utils/writerColumn'

/**
 * The copy of a personal record in the shared account (spec «What a copy carries»), pure. A
 * whitelist: nothing else of the personal record (note, line items, attachments, counterparty,
 * wallet, SMS text, tags, subcategory) ever reaches the shared sheet.
 */

type Values = Record<string, string | number>

export const sharedRef = (personalSpreadsheetId: string, recordId: string): string =>
  `share:${personalSpreadsheetId}:${recordId}`

/** The cells a later edit of the personal record may change; the rest of the copy stays. */
const EDITABLE_IDS = [
  'date',
  'title',
  'category',
  'amount',
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
]

const COPY_IDS = [...EDITABLE_IDS, SHARED_CREATOR_FIELD_ID, SHARED_REF_FIELD_ID]

/** The shared account's form of a type (standard fields + payer, split, creator, ref). */
export function sharedRecordForm(type: 'income' | 'expense'): CustomForm {
  return withStandardFields(getDefaultForms(), false, true).find(form => form.type === type)!
}

/** The personal category when the shared list has that exact name, else «سایر». */
export function sharedCategory(category: unknown, list: readonly string[]): string {
  const name = String(category ?? '').trim()

  return name && name !== SETTLEMENT_CATEGORY && list.includes(name) ? name : 'سایر'
}

/** Column of each whitelisted field in `headers`, by its label (never by position). */
function columnsOf(form: CustomForm, headers: string[], ids: string[]): Map<string, number> {
  const labels = headers.map(normalizeHeaderLabel)
  const columns = new Map<string, number>()

  for (const field of form.fields) {
    const column = labels.indexOf(normalizeHeaderLabel(field.label))

    if (ids.includes(field.id) && column > 1) columns.set(field.id, column)
  }

  return columns
}

export interface CopyInput {
  form: CustomForm
  /** The target tab's own header row. */
  headers: string[]
  recordId: string
  values: Values
  split: SharedSplit
  payer: string
  creator: string
  /** Already one of the shared account's categories (`sharedCategory`). */
  category: string
  ref: string
  createdAt?: string
}

export function buildCopyRow(input: CopyInput): string[] {
  const { form, headers, values } = input
  const expense = form.type === 'expense'
  const cells: Values = {
    date: values.date ?? '',
    title: values.title ?? '',
    amount: values.amount ?? '',
    category: input.category,
    [SHARED_PAYER_FIELD_ID]: expense ? input.payer : '',
    [SHARED_SPLIT_FIELD_ID]: expense ? input.split : '',
    [SHARED_CREATOR_FIELD_ID]: input.creator,
    [SHARED_REF_FIELD_ID]: input.ref
  }
  const row = headers.map(() => '')

  row[0] = input.recordId
  row[1] = input.createdAt ?? new Date().toLocaleString('fa-IR')
  columnsOf(form, headers, COPY_IDS).forEach((column, id) => {
    row[column] = String(cells[id] ?? '')
  })

  return withWriterCell(row, headerWriterColumn(headers), input.creator)
}

export interface CopyMatch {
  sheetName: string
  /** 1-based, header = 1. */
  rowNumber: number
  row: string[]
  headers: string[]
}

/** The row whose «مرجع» is `ref`, in the tabs given (the record tab and its yearly archives). */
export function findCopyByRef(tabs: Map<string, string[][]>, ref: string): CopyMatch | null {
  for (const [sheetName, [headers = [], ...rows]] of tabs) {
    const column = headers.map(normalizeHeaderLabel).indexOf(SHARED_REF_FIELD_LABEL)
    const index = column < 0 ? -1 : rows.findIndex(row => (row[column] ?? '').trim() === ref)

    if (index >= 0) return { sheetName, rowNumber: index + 2, row: rows[index], headers }
  }

  return null
}

export interface CopyTask {
  kind: 'create' | 'update' | 'delete'
  ref: string
  values: Values
  split: SharedSplit
  payer: string
  unlink?: boolean
}

export interface CopyContext {
  task: CopyTask
  form: CustomForm
  /** The record tab new copies go to. */
  base: string
  /** The record tab and its archives, each with its header row. */
  tabs: Map<string, string[][]>
  /** The shared account's categories of the record type. */
  categories: string[]
  me: string
  createdAt: string
  newId: string
}

/**
 * What to write for a task, or null when nothing has to change: a create whose copy is already
 * there (a retry) only updates it, a delete or unlink of a copy that is gone is done, and an
 * update of a copy the shared account removed does not bring it back.
 */
export function copyOperation(context: CopyContext): OutboxOperation | null {
  const { task, form, base, tabs } = context
  const found = findCopyByRef(tabs, task.ref)

  if (task.kind === 'delete') {
    return found
      ? {
          type: 'delete',
          sheetName: found.sheetName,
          rowNumber: found.rowNumber,
          expectedRow: found.row
        }
      : null
  }

  const fresh = (headers: string[], recordId: string) =>
    buildCopyRow({
      form,
      headers,
      recordId,
      values: task.values,
      split: task.split,
      payer: task.payer || context.me,
      creator: context.me,
      category: sharedCategory(task.values.category, context.categories),
      ref: task.unlink ? '' : task.ref,
      createdAt: context.createdAt
    })

  if (!found) {
    if (task.kind === 'update') return null

    const headers = tabs.get(base)?.[0]?.length ? tabs.get(base)![0] : buildHeaders(form.fields)

    return { type: 'append', sheetName: base, row: fresh(headers, context.newId) }
  }

  // Sheets trims empty trailing cells: pad to the header so every column has a cell.
  const width = Math.max(found.headers.length, found.row.length)
  const current = Array.from({ length: width }, (_, index) => found.row[index] ?? '')
  const next = [...current]
  const source = fresh(found.headers, found.row[0])

  columnsOf(form, found.headers, task.unlink ? [SHARED_REF_FIELD_ID] : EDITABLE_IDS).forEach(
    column => {
      next[column] = source[column]
    }
  )

  if (next.join('\u0000') === current.join('\u0000')) return null

  return {
    type: 'update',
    sheetName: found.sheetName,
    rowNumber: found.rowNumber,
    expectedRow: found.row,
    row: withWriterCell(next, headerWriterColumn(found.headers), context.me)
  }
}
