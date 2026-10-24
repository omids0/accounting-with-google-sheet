import type { CustomForm } from '../types'
import { isNumericCell } from '../utils/sheetValues'

/**
 * The positional layout older builds wrote income/expense rows in: «شناسه»، «زمان ثبت»، then the
 * form fields in the order the default forms listed them (amount BEFORE category), with the
 * fields added later (subcategory … line items) appended. The header row of such a tab may have
 * been rewritten in today's sorted order, so the same cells then sit under the wrong labels.
 */
const LEGACY_FIELD_IDS = [
  'date',
  'title',
  'amount',
  'category',
  'note',
  'subCategory',
  'walletAccount',
  'walletApply',
  'counterparty',
  'lineItems'
]

const LEGACY_FIRST_COLUMN = 2

const columnOf = (fieldId: string): number =>
  LEGACY_FIRST_COLUMN + LEGACY_FIELD_IDS.indexOf(fieldId)

const LEGACY_AMOUNT_COLUMN = columnOf('amount')

const LEGACY_CATEGORY_COLUMN = columnOf('category')

/** Slots after the balance switch: the writer email sits in the first one the row actually had. */
const LEGACY_COUNTERPARTY_COLUMN = columnOf('counterparty')

const LEGACY_ITEMS_COLUMN = columnOf('lineItems')

const LEGACY_WRITER_COLUMN = LEGACY_ITEMS_COLUMN + 1

const EMAIL_CELL = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/

export interface LegacyLayoutPlan {
  /** Column that holds the amount under the tab's header. */
  amountColumn: number
  /** Legacy column → the column the header gives that field. */
  moves: [from: number, to: number][]
  /** Column of «ثبت‌کننده» in the header; -1 when the tab has none. */
  writerColumn: number
  /** Cells a rebuilt row has at least. */
  width: number
  /** The form's category names: a number in the category column is told from an amount by them. */
  knownCategories: Set<string>
}

const norm = (cell: unknown): string =>
  String(cell ?? '')
    .normalize('NFC')
    .trim()

/**
 * Whether the header is the one that can hide legacy rows (category at column 4, amount elsewhere)
 * and, if so, how to move a legacy row. Null for every other tab: nothing to detect.
 */
export function legacyLayoutPlan(
  form: Pick<CustomForm, 'type' | 'fields'>,
  columnMap: Map<string, number>,
  writerColumn: number,
  headerWidth: number
): LegacyLayoutPlan | null {
  if (form.type !== 'income' && form.type !== 'expense') return null

  const amountColumn = columnMap.get('amount')

  if (amountColumn == null || amountColumn === LEGACY_AMOUNT_COLUMN) return null
  if (columnMap.get('category') !== LEGACY_AMOUNT_COLUMN) return null

  const moves: [number, number][] = []

  for (const id of LEGACY_FIELD_IDS) {
    const to = columnMap.get(id)

    if (to != null) moves.push([columnOf(id), to])
  }

  return {
    amountColumn,
    moves,
    writerColumn,
    width: Math.max(headerWidth, LEGACY_WRITER_COLUMN + 1),
    knownCategories: new Set(
      (form.fields.find(field => field.id === 'category')?.options ?? []).map(norm)
    )
  }
}

export type LegacyRowKind = 'legacy' | 'current' | 'ambiguous'

/**
 * A legacy row keeps its amount where the header says «دسته‌بندی». It is told from a current row by
 * the cell under «مبلغ»: no number there means legacy. A number there is a current row, unless the
 * cell in column 4 is no category of the form while the next one is (a legacy row whose note is a
 * number). A number in column 4 that IS a category of the form with no amount beside it could be
 * a current row with a numeric category name: 'ambiguous', never rewritten.
 */
export function classifyRow(row: readonly unknown[], plan: LegacyLayoutPlan): LegacyRowKind {
  if (!isNumericCell(row[LEGACY_AMOUNT_COLUMN])) return 'current'

  const categoryHere = plan.knownCategories.has(norm(row[LEGACY_AMOUNT_COLUMN]))

  if (!isNumericCell(row[plan.amountColumn])) return categoryHere ? 'ambiguous' : 'legacy'

  const categoryNext = plan.knownCategories.has(norm(row[LEGACY_CATEGORY_COLUMN]))

  return !categoryHere && categoryNext ? 'legacy' : 'current'
}

export const isLegacyRow = (row: readonly unknown[], plan: LegacyLayoutPlan): boolean =>
  classifyRow(row, plan) === 'legacy'

/**
 * True when rebuilding `row` as `next` would drop a non-empty cell of the legacy part (a column
 * the header has no field for, an e-mail without a «ثبت‌کننده» column …): such a row is read, but a
 * repair must not rewrite it.
 */
export function losesCells(row: readonly unknown[], next: readonly unknown[]): boolean {
  const left = new Map<string, number>()

  for (const cell of next.slice(LEGACY_FIRST_COLUMN)) {
    const key = norm(cell)

    if (key) left.set(key, (left.get(key) ?? 0) + 1)
  }
  for (const cell of row.slice(LEGACY_FIRST_COLUMN)) {
    const key = norm(cell)

    if (!key) continue

    const count = left.get(key) ?? 0

    if (!count) return true
    left.set(key, count - 1)
  }

  return false
}

/** The row's cells under today's header; the row itself when it is not a legacy one. */
export function remapLegacyRow(row: unknown[], plan: LegacyLayoutPlan | null): unknown[] {
  if (!plan || !isLegacyRow(row, plan)) return row

  const next: unknown[] = Array.from({ length: Math.max(plan.width, row.length) }, () => '')

  next[0] = row[0] ?? ''
  next[1] = row[1] ?? ''
  // Rows written before the later columns existed carry the writer in the first free slot after
  // the balance switch (counterparty, items or the writer column itself): never a counterparty.
  const isWriterSlot = (column: number) => EMAIL_CELL.test(String(row[column] ?? '').trim())

  const slots = [LEGACY_COUNTERPARTY_COLUMN, LEGACY_ITEMS_COLUMN, LEGACY_WRITER_COLUMN]

  const writerSlot = slots.filter(isWriterSlot).pop()

  for (const [from, to] of plan.moves) {
    next[to] = slots.includes(from) && isWriterSlot(from) ? '' : row[from] ?? ''
  }
  if (plan.writerColumn >= 0 && writerSlot !== undefined) {
    next[plan.writerColumn] = String(row[writerSlot]).trim()
  }

  // Cells past the legacy part (receipts …) stay where they were.
  for (let column = LEGACY_WRITER_COLUMN + 1; column < row.length; column++) {
    if (plan.writerColumn !== column && String(next[column] ?? '') === '')
      next[column] = row[column]
  }

  return next
}
