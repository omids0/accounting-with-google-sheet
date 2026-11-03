import { parseTrail, sameFieldValue } from './activityTrail'
import type { ParsedTrail, TrailCells } from './activityTrailModel'
import type { CustomForm } from '../types'

/** The part of a log row the revert rules read. */
export interface TrailEntry extends TrailCells {
  id: string
  action: string
  module: string
  /** The record the row is about. */
  itemId: string
}

export type RevertKind = 'update' | 'delete'

export type RevertCheck = { ok: true } | { ok: false; reason: string }

/**
 * What reverting this row would do: undo an edit, or bring a deleted record back. Null for every
 * row that cannot be reverted: no trail (an older row or app), another module, a value that was
 * cut, or a «بازگردانی شد» row itself (the log only ever grows; a revert is not reverted).
 */
export function revertKindOf(entry: TrailEntry): { kind: RevertKind; trail: ParsedTrail } | null {
  if (entry.module !== 'records') return null

  const trail = parseTrail(entry)

  if (!trail || trail.cut || trail.revertOf || !trail.formId) return null
  if (entry.action === 'update' && Object.keys(trail.after).length) return { kind: 'update', trail }
  if (entry.action === 'delete' && Object.keys(trail.before).length)
    return { kind: 'delete', trail }

  return null
}

export interface OfferContext {
  /** Ids of the log rows that already have a «بازگردانی شد» row. */
  reverted: ReadonlySet<string>
  /** The signed-in user's e-mail, lower case. */
  me: string
  /** The shared-account permission table (always true outside a shared account). */
  may: (permission: 'record' | 'editOthers') => boolean
}

/**
 * Whether the activity page shows the «بازگردانی» button on this row: it has revert data, was not
 * reverted yet, and the person may write records (and edit what others wrote, for another's row).
 */
export function revertOffered(entry: TrailEntry & { email: string }, ctx: OfferContext): boolean {
  if (!revertKindOf(entry) || ctx.reverted.has(entry.id)) return false
  if (!ctx.may('record')) return false

  return entry.email === ctx.me || ctx.may('editOthers')
}

/** Ids of the log rows that already have a «بازگردانی شد» row: they are never offered again. */
export function revertedLogIds(entries: readonly TrailEntry[]): Set<string> {
  const ids = new Set<string>()

  for (const entry of entries) {
    const revertOf = parseTrail(entry)?.revertOf

    if (revertOf) ids.add(revertOf)
  }

  return ids
}

/**
 * Whether the record still looks the way the log row left it. An edit is reverted only while every
 * field it changed still holds the logged «بعد»; a delete only while the record is not back.
 * `current` is the record as it is now (null: it is gone).
 */
export function checkRevert(
  kind: RevertKind,
  trail: ParsedTrail,
  form: CustomForm,
  current: Record<string, string> | null,
  alreadyReverted: boolean
): RevertCheck {
  if (alreadyReverted) return { ok: false, reason: 'این تغییر قبلاً بازگردانده شده است.' }

  if (kind === 'delete') {
    return current
      ? { ok: false, reason: 'این تراکنش دوباره در دفتر هست؛ دوباره ساخته نمی‌شود.' }
      : { ok: true }
  }
  if (!current) return { ok: false, reason: 'این تراکنش دیگر در دفتر نیست.' }

  const fields = form.fields.filter(field => field.id in trail.after)

  if (fields.length !== Object.keys(trail.after).length) {
    return { ok: false, reason: 'فیلدهای فرم تراکنش‌ها بعد از این تغییر عوض شده‌اند.' }
  }

  if (fields.every(field => sameFieldValue(field, current[field.id], trail.before[field.id]))) {
    return {
      ok: false,
      reason: 'تراکنش همین حالا هم مقدار «قبل» را دارد؛ چیزی برای بازگرداندن نیست.'
    }
  }

  const changed = fields.filter(
    field => !sameFieldValue(field, current[field.id], trail.after[field.id])
  )

  if (changed.length) {
    const names = changed.map(field => `«${field.label}»`).join('، ')

    return {
      ok: false,
      reason: `از این تغییر به بعد، ${names} دوباره عوض شده؛ بازگرداندن مقدار تازه‌تر را پاک می‌کند.`
    }
  }

  return { ok: true }
}
