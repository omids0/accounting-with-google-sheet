import { rowsMatchForCompare } from './sheetsCellValues'
import { parseNumeric } from '../utils/parseNumeric'
import { cellToString } from '../utils/sheetValues'
import { parseWriter, WRITER_HEADER } from '../utils/writerColumn'

/**
 * Two people edited the same row before this device's write landed. Pure on
 * purpose: a future backend runs the same rule on its own rows.
 */
export interface RowConflict {
  entryId: string
  sheetName: string
  rowNumber: number
  mine: string[]
  theirs: string[]
  base: string[]
  theirEmail: string
  theirAt: string
  /** When this device made its edit (a time cell or ISO), for «نسخهٔ من · ۱۴:۰۱». */
  mineAt?: string
}

/** Thrown by an outbox update whose row another account changed meanwhile. */
export class RowEditConflictError extends Error {
  constructor(
    public readonly theirs: string[],
    public readonly theirEmail: string,
    public readonly theirAt: string
  ) {
    super('این ردیف هم‌زمان روی حساب دیگری عوض شده است.')
    this.name = 'RowEditConflictError'
  }
}

/**
 * 'conflict' only when the row the device read (`base`) changed and the last
 * writer was someone else. No base (old queue), an unchanged row, a row that
 * already equals mine, a tab without «ثبت‌کننده», or a writer that is empty
 * (an older app) or me (my other device) all mean 'none'.
 */
export function detectRowConflict(
  base: string[] | undefined,
  current: string[],
  mine: string[],
  myEmail: string,
  writerColumn: number
): 'none' | 'conflict' {
  if (!base) return 'none'
  if (rowsMatchForCompare(current, base) || rowsMatchForCompare(current, mine)) return 'none'
  if (writerColumn < 0) return 'none'

  const writer = parseWriter(current[writerColumn])

  if (!writer || writer === parseWriter(myEmail)) return 'none'

  return 'conflict'
}

export interface CellDiff {
  label: string
  mine: string
  theirs: string
}

/** The cells that differ, labelled by the tab's header; «ثبت‌کننده» is left out. */
export function diffCells(headers: string[], mine: string[], theirs: string[]): CellDiff[] {
  const width = Math.max(headers.length, mine.length, theirs.length)
  const diffs: CellDiff[] = []

  for (let index = 0; index < width; index += 1) {
    const label = cellToString(headers[index]).trim() || `ستون ${index + 1}`
    const a = cellToString(mine[index]).trim()
    const b = cellToString(theirs[index]).trim()

    if (label === WRITER_HEADER || a === b) continue
    diffs.push({ label, mine: a, theirs: b })
  }

  return diffs
}

function cellByLabel(headers: string[], row: string[], labels: string[]): string {
  const index = headers.findIndex(header => labels.includes(cellToString(header).trim()))

  return index < 0 ? '' : cellToString(row[index]).trim()
}

/** When their version was saved: «زمان ویرایش» if the tab has it, else «زمان ثبت». */
export function rowTimeCell(headers: string[], row: string[]): string {
  return cellByLabel(headers, row, ['زمان ویرایش']) || cellByLabel(headers, row, ['زمان ثبت'])
}

/** A name for the row in the sheet text: its title, a check's number, or its id. */
export function rowTitle(headers: string[], row: string[]): string {
  const check = cellByLabel(headers, row, ['شماره چک'])

  if (check) return `چک ${check}`

  return (
    cellByLabel(headers, row, ['عنوان']) ||
    cellByLabel(headers, row, ['دسته‌بندی', 'دسته']) ||
    cellToString(row[0]).trim()
  )
}

/** «مبلغ ۲٬۴۰۰٬۰۰۰ · دسته خانه › تعمیر» under each option. */
export function rowSummary(headers: string[], row: string[]): string {
  const amount = cellByLabel(headers, row, ['مبلغ', 'مبلغ قسط'])
  const category = cellByLabel(headers, row, ['دسته‌بندی', 'دسته'])
  const sub = cellByLabel(headers, row, ['زیردسته'])
  const amountText = amount ? `مبلغ ${parseNumeric(amount).toLocaleString('fa-IR')}` : ''
  const categoryText = category ? `دسته ${[category, sub].filter(Boolean).join(' › ')}` : ''

  return [amountText, categoryText].filter(Boolean).join(' · ')
}
