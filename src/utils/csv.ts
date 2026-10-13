import { normalizeDigits } from './normalizeDigits'
import { saveExportFile } from './saveFile'

/** Spreadsheet apps evaluate a cell that starts with one of these as a formula. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

const NUMERIC_CELL = /^[+-]?(?:\d+(?:[.,]\d+)*|\.\d+)$/

const FORMULA_ESCAPE = "'"

function isPlainNumber(value: string): boolean {
  return NUMERIC_CELL.test(normalizeDigits(value))
}

/**
 * Prefixes a quote to cells Excel/Sheets would run as a formula (CSV injection).
 * Plain numbers such as `-1500` stay untouched so amounts keep their type.
 */
export function neutralizeCsvFormula(value: string): string {
  if (!FORMULA_TRIGGER.test(value) || isPlainNumber(value)) return value

  return `${FORMULA_ESCAPE}${value}`
}

/** Reverses {@link neutralizeCsvFormula} so an exported file re-imports unchanged. */
export function restoreCsvFormula(value: string): string {
  if (!value.startsWith(FORMULA_ESCAPE)) return value

  const rest = value.slice(FORMULA_ESCAPE.length)

  return FORMULA_TRIGGER.test(rest) && !isPlainNumber(rest) ? rest : value
}

export function escapeCsvValue(value: string): string {
  const safe = neutralizeCsvFormula(value)

  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }

  return safe
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsvValue).join(',')]

  for (const row of rows) {
    lines.push(row.map(cell => escapeCsvValue(String(cell ?? ''))).join(','))
  }

  return lines.join('\r\n')
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []

  let row: string[] = []

  let cell = ''

  let inQuotes = false

  const content = text.replace(/^\uFEFF/, '')

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]

    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(cell)
      cell = ''
    } else if (ch === '\r' && next === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'text/csv;charset=utf-8'
): Promise<string | null> {
  return saveExportFile(filename, new Blob(['\uFEFF' + content], { type: mimeType }))
}

/** Some browsers refocus the window before `change` fires, so wait a moment before calling it a cancel. */
export const PICKER_CANCEL_GRACE_MS = 1000

/** Resolves `null` when the picker is dismissed, so callers never hang on a cancelled pick. */
export function pickTextFile(accept = '.csv,text/csv'): Promise<string | null> {
  return pickFile(accept).then(file => (file ? file.text() : null))
}

/** Opens the system file picker; `null` when it is dismissed. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')

    let settled = false

    let focusTimer: ReturnType<typeof setTimeout> | undefined

    const settle = () => {
      if (settled) return false
      settled = true
      window.removeEventListener('focus', handleFocus)
      clearTimeout(focusTimer)

      return true
    }

    const cancel = () => {
      if (settle()) resolve(null)
    }

    // Fallback for browsers without the input `cancel` event (older Chrome/Safari, some WebViews).
    function handleFocus() {
      clearTimeout(focusTimer)
      focusTimer = setTimeout(() => {
        if (!input.files?.length) cancel()
      }, PICKER_CANCEL_GRACE_MS)
    }

    input.type = 'file'
    input.accept = accept
    input.addEventListener('cancel', cancel)
    input.addEventListener('change', () => {
      const file = input.files?.[0]

      if (!file) {
        cancel()

        return
      }
      if (settle()) resolve(file)
    })
    input.click()
    window.addEventListener('focus', handleFocus)
  })
}
