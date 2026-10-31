import {
  NO_TRAIL,
  TRAIL_CELL_MAX,
  TRAIL_SECRET_FIELD,
  TRAIL_VALUE_MAX,
  TRAIL_VERSION,
  type ParsedTrail,
  type TrailCells
} from './activityTrailModel'
import { SHARED_LINK_FIELD_ID } from '../components/form/sharedFields'
import type { CustomForm, FieldConfig } from '../types'
import { parseNumeric } from '../utils/parseNumeric'
import { normalizeSheetDate } from '../utils/sheetValues'

type Values = Record<string, unknown>

const text = (value: unknown): string =>
  value === undefined || value === null ? '' : String(value)

const SECRET_ID = /(^|[^a-z])(pass|password|passcode|pin|token|secret|otp|cvv)([^a-z]|$)/i

/** A field the trail may carry: never a secret, never the link to a shared copy. */
export function isTrailField(field: FieldConfig): boolean {
  return (
    field.id !== SHARED_LINK_FIELD_ID &&
    !SECRET_ID.test(field.id) &&
    !TRAIL_SECRET_FIELD.test(field.label)
  )
}

/** Whether two stored values of `field` mean the same thing (a number, a date, a text). */
export function sameFieldValue(field: FieldConfig | undefined, a: unknown, b: unknown): boolean {
  const left = text(a).trim()
  const right = text(b).trim()

  if (left === right) return true
  if (field?.type === 'date') return normalizeSheetDate(left) === normalizeSheetDate(right)
  if ((field?.type === 'number' || field?.id === 'amount') && left && right) {
    const x = parseNumeric(left)
    const y = parseNumeric(right)

    return Number.isFinite(x) && Number.isFinite(y) && x === y
  }

  return false
}

function clip(value: string): { text: string; cut: boolean } {
  return value.length > TRAIL_VALUE_MAX
    ? { text: `${value.slice(0, TRAIL_VALUE_MAX)}…`, cut: true }
    : { text: value, cut: false }
}

function tagOf(form: CustomForm, cut: boolean, revertOf?: string): string {
  return [
    TRAIL_VERSION,
    `form=${encodeURIComponent(form.id)}`,
    cut ? 'cut' : '',
    revertOf ? `revert=${encodeURIComponent(revertOf)}` : ''
  ]
    .filter(Boolean)
    .join(';')
}

function pack(map: Record<string, string>): string | null {
  const json = JSON.stringify(map)

  return json.length > TRAIL_CELL_MAX ? null : json
}

/**
 * The cells of an edit: ONLY the fields that changed, before and after. No change, or a change too
 * big for a cell, leaves no trail. A changed field the trail must not carry (a secret) or a value
 * cut short marks the row `cut`: it still shows, but it is never offered for revert.
 */
export function editTrail(
  form: CustomForm,
  before: Values,
  after: Values,
  revertOf?: string
): TrailCells {
  const was: Record<string, string> = {}
  const now: Record<string, string> = {}
  let cut = false

  for (const field of form.fields) {
    if (sameFieldValue(field, before[field.id], after[field.id])) continue
    if (!isTrailField(field)) {
      cut = true
      continue
    }

    const from = clip(text(before[field.id]))
    const to = clip(text(after[field.id]))

    cut = cut || from.cut || to.cut
    was[field.id] = from.text
    now[field.id] = to.text
  }

  const packedBefore = pack(was)
  const packedAfter = pack(now)

  if (!Object.keys(was).length || packedBefore === null || packedAfter === null) return NO_TRAIL

  return { before: packedBefore, after: packedAfter, version: tagOf(form, cut, revertOf) }
}

/** The cells of a delete: every non-empty field of the record, in `before`. */
export function deleteTrail(form: CustomForm, values: Values): TrailCells {
  const kept: Record<string, string> = {}
  let cut = false

  for (const field of form.fields) {
    const value = text(values[field.id])

    if (!value) continue
    if (!isTrailField(field)) {
      cut = true
      continue
    }

    const clipped = clip(value)

    cut = cut || clipped.cut
    kept[field.id] = clipped.text
  }

  const packed = pack(kept)

  if (!Object.keys(kept).length || packed === null) return NO_TRAIL

  return { before: packed, after: '', version: tagOf(form, cut) }
}

/** The cells of a «بازگردانی شد» row that has no change to show (a delete brought back). */
export function revertMarkTrail(form: CustomForm, revertOf: string): TrailCells {
  return { before: '', after: '', version: tagOf(form, false, revertOf) }
}

function parseMap(cell: string): Record<string, string> | null {
  if (!cell.trim()) return {}

  try {
    const parsed: unknown = JSON.parse(cell)

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const entries = Object.entries(parsed as Record<string, unknown>)

    if (entries.some(([, value]) => typeof value !== 'string')) return null

    return Object.fromEntries(entries) as Record<string, string>
  } catch {
    return null
  }
}

function decoded(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** The trail of a log row, or null for a row without one (older rows, other modules, unknown format). */
export function parseTrail(cells: TrailCells): ParsedTrail | null {
  const parts = cells.version.trim().split(';')

  if (parts[0] !== TRAIL_VERSION) return null

  const tag = (name: string) =>
    decoded(parts.find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? '')
  const before = parseMap(cells.before)
  const after = parseMap(cells.after)

  return {
    formId: tag('form'),
    before: before ?? {},
    after: after ?? {},
    // A cell that does not read back is as unsafe as a cut value.
    cut: parts.includes('cut') || before === null || after === null,
    revertOf: tag('revert')
  }
}
