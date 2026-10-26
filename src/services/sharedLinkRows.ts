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
  parseSplit,
  type SharedSplit
} from '../components/form/sharedFields'
import type { CustomForm } from '../types'
import { parseNumeric } from '../utils/parseNumeric'
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
export function columnsOf(form: CustomForm, headers: string[], ids: string[]): Map<string, number> {
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

/**
 * The row whose «مرجع» is `ref` (or whose id is `id`: a copy kept without a link has no ref), in
 * the tabs given (the record tab and its yearly archives).
 */
export function findCopyByRef(
  tabs: Map<string, string[][]>,
  ref: string,
  id?: string
): CopyMatch | null {
  for (const [sheetName, [headers = [], ...rows]] of tabs) {
    const column = headers.map(normalizeHeaderLabel).indexOf(SHARED_REF_FIELD_LABEL)
    const index = rows.findIndex(
      row => (column >= 0 && (row[column] ?? '').trim() === ref) || (!!id && row[0] === id)
    )

    if (index >= 0) return { sheetName, rowNumber: index + 2, row: rows[index], headers }
  }

  return null
}

export interface CopyTask {
  kind: 'create' | 'update' | 'delete'
  ref: string
  values: Values
  /** '' = unset (see `SharedLinkTask`). */
  split: SharedSplit | ''
  payer: string
  unlink?: boolean
}

/** The copy's own category, payer and split, as the shared account has them now. */
export function copyCells(
  found: CopyMatch,
  form: CustomForm
): { category: string; payer: string; split: SharedSplit } {
  const cells = columnsOf(form, found.headers, EDITABLE_IDS)
  const cell = (id: string) => (found.row[cells.get(id) ?? -1] ?? '').trim()

  return {
    category: cell('category'),
    payer: cell(SHARED_PAYER_FIELD_ID),
    split: parseSplit(cell(SHARED_SPLIT_FIELD_ID))
  }
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
  /** The id a new copy gets: stable per task, so a retried create finds the copy it wrote. */
  newId: string
}

/**
 * What to write for a task, or null when nothing has to change: a create whose copy is already
 * there (a retry) only updates it, a delete or unlink of a copy that is gone is done, and an
 * update of a copy the shared account removed does not bring it back.
 */
export function copyOperation(context: CopyContext): OutboxOperation | null {
  const { task, form, base, tabs } = context
  const found = findCopyByRef(tabs, task.ref, task.kind === 'create' ? context.newId : undefined)

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

  // Unset cells keep what the copy has (an edit that only fixes a typo), else the defaults.
  const current = found ? copyCells(found, form) : null
  const asked = String(task.values.category ?? '').trim()
  // The copy's own category stays when none is asked, or when the asked one (seeded from the copy)
  // is gone from the shared list: never silently «سایر».
  const category =
    (current && (!asked || (asked === current.category && !context.categories.includes(asked)))
      ? current.category
      : '') || sharedCategory(asked, context.categories)
  const titleColumn = found ? columnsOf(form, found.headers, ['title']).get('title') : undefined
  const currentTitle = found ? (found.row[titleColumn ?? -1] ?? '').trim() : ''
  const fresh = (headers: string[], recordId: string) =>
    buildCopyRow({
      form,
      headers,
      recordId,
      // No typed title: the copy's own (a partner may have renamed it), else the shared category
      // names it, never a personal word.
      values: { ...task.values, title: task.values.title || currentTitle || category },
      split: task.split || current?.split || 'equal',
      payer: task.payer || current?.payer || context.me,
      creator: context.me,
      category,
      ref: task.unlink ? '' : task.ref,
      createdAt: context.createdAt
    })

  if (!found) {
    const { date, amount } = task.values

    if (task.kind === 'update' || !String(date ?? '').trim() || !(parseNumeric(amount) > 0)) {
      return null
    }

    const headers = tabs.get(base)?.[0]?.length ? tabs.get(base)![0] : buildHeaders(form.fields)

    return { type: 'append', sheetName: base, row: fresh(headers, context.newId) }
  }

  // Sheets trims empty trailing cells: pad to the header so every column has a cell.
  const width = Math.max(found.headers.length, found.row.length)
  const padded = Array.from({ length: width }, (_, index) => found.row[index] ?? '')
  const next = [...padded]
  const source = fresh(found.headers, found.row[0])

  columnsOf(form, found.headers, task.unlink ? [SHARED_REF_FIELD_ID] : EDITABLE_IDS).forEach(
    column => {
      next[column] = source[column]
    }
  )

  if (next.join('\u0000') === padded.join('\u0000')) return null

  return {
    type: 'update',
    sheetName: found.sheetName,
    rowNumber: found.rowNumber,
    expectedRow: found.row,
    row: withWriterCell(next, headerWriterColumn(found.headers), context.me)
  }
}
