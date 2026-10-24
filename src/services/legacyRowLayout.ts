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
}

/**
 * Whether the header is the one that can hide legacy rows (category at column 4, amount elsewhere)
 * and, if so, how to move a legacy row. Null for every other tab: nothing to detect.
 */
export function legacyLayoutPlan(
  form: Pick<CustomForm, 'type'>,
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
    width: Math.max(headerWidth, LEGACY_WRITER_COLUMN + 1)
  }
}

/**
 * A legacy row keeps its amount where the header says «دسته‌بندی» and has no number where the
 * header says «مبلغ». The reverse (a number in the amount column) is always taken as a current row.
 */
export function isLegacyRow(row: readonly unknown[], plan: LegacyLayoutPlan): boolean {
  return isNumericCell(row[LEGACY_AMOUNT_COLUMN]) && !isNumericCell(row[plan.amountColumn])
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
