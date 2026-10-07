import { sortFormFields } from '../components/form/fieldUtils'
import type { FieldConfig } from '../types'
import { cellToString, normalizeSheetDate } from '../utils/sheetValues'

export function normalizeHeaderLabel(label: string): string {
  return label.normalize('NFC').trim()
}

export function buildHeaders(fields: FieldConfig[]): string[] {
  return ['شناسه', 'زمان ثبت', ...sortFormFields(fields).map(f => f.label)]
}

export function buildFieldColumnMap(headers: string[], fields: FieldConfig[]): Map<string, number> {
  const normalizedHeaders = headers.map(normalizeHeaderLabel)

  const map = new Map<string, number>()
  const byLabel = fields.map(field =>
    normalizedHeaders.findIndex(header => header === normalizeHeaderLabel(field.label))
  )
  const claimed = new Set(byLabel.filter(column => column >= 0))
  // Same column the header migration appends to (end of the header row).
  let nextFree = normalizedHeaders.length

  fields.forEach((field, index) => {
    if (byLabel[index] >= 0) {
      map.set(field.id, byLabel[index])

      return
    }

    // Positional fallback, unless another field already owns that column by its
    // label (a field added before its header exists must not overwrite it).
    let column = index + 2

    if (claimed.has(column)) {
      while (claimed.has(nextFree)) nextFree++
      column = nextFree++
    }
    claimed.add(column)
    map.set(field.id, column)
  })

  return map
}

export function buildRecordRow(
  headers: string[],
  fields: FieldConfig[],
  recordId: string,
  createdAt: string,
  values: Record<string, string | number>
): string[] {
  const columnMap = buildFieldColumnMap(headers, fields)

  const width = Math.max(headers.length, 2 + fields.length)

  const row = Array.from({ length: width }, () => '')

  row[0] = recordId
  row[1] = createdAt

  for (const field of fields) {
    const column = columnMap.get(field.id)

    if (column == null) continue

    const val = values[field.id]

    row[column] = val !== undefined && val !== null ? String(val) : ''
  }

  return row
}

export function mapRowToValues(
  row: unknown[],
  fields: FieldConfig[],
  columnMap: Map<string, number>
): Record<string, string> {
  const values: Record<string, string> = {}

  for (const field of fields) {
    const column = columnMap.get(field.id)

    const raw = column == null ? '' : row[column]

    values[field.id] = field.type === 'date' ? normalizeSheetDate(raw) : cellToString(raw)
  }

  return values
}
