import { submitRecordEdit } from './recordsMutations'
import { enrichRecord, type StoredRecord } from './recordsUtils'
import { activityLogSettled, fetchActivityLog } from '../../services/activityLog'
import type { ParsedTrail } from '../../services/activityTrailModel'
import { checkRevert, revertKindOf, revertedLogIds } from '../../services/activityTrailRevert'
import type { RevertKind, TrailEntry } from '../../services/activityTrailRevert'
import { isBuildingExpenseValues } from '../../services/buildingExpenseSplit'
import { getSettings } from '../../services/settings'
import { fetchRecords } from '../../services/sheets'
import { isPersonalWorkspace } from '../../services/workspace'
import type { CustomForm, FieldConfig } from '../../types'
import { showSuccess } from '../../utils/toast'
import { isVehicleExpenseCategory } from '../../utils/vehicleExpenseUtils'
import { writeEntryRecord, settleSavedEntry } from '../dataEntry/writeEntryRecord'
import { isLinked } from '../form/sharedFields'

/** One field of the preview: the value now, and the one the revert puts back. */
export interface RevertChange {
  field: FieldConfig
  from: string
  to: string
}

export interface RevertPlan {
  entry: TrailEntry
  kind: RevertKind
  form: CustomForm
  trail: ParsedTrail
  /** The record as it is now; null for a deleted one (it is created again). */
  record: StoredRecord | null
  changes: RevertChange[]
}

export type RevertPreview = { ok: true; plan: RevertPlan } | { ok: false; reason: string }

export type RevertResult =
  | { status: 'done' }
  | { status: 'refused'; reason: string }
  | { status: 'failed' }
  | { status: 'busy' }

/** Every row of the log tab and its loaded archives. */
const LOG_READ_LIMIT = 100_000

/** Log rows being reverted right now (a double tap) and those reverted in this session. */
const running = new Set<string>()
const doneHere = new Set<string>()

const NOT_HERE = 'بازگردانی فقط در دفتر شخصی انجام می‌شود.'
const SPECIAL =
  'این تراکنش به خودرو، ساختمان یا حساب مشترک وصل است؛ بازگرداندنش از اینجا امن نیست. خودت در «تراکنش‌ها» ویرایشش کن.'

function isSpecial(values: Record<string, string>): boolean {
  return (
    isVehicleExpenseCategory(values.category ?? '') ||
    isBuildingExpenseValues(values) ||
    isLinked(values)
  )
}

function changesOf(
  form: CustomForm,
  kind: RevertKind,
  trail: ParsedTrail,
  current: Record<string, string> | null
): RevertChange[] {
  const restored = trail.before

  return form.fields
    .filter(field => field.id in restored)
    .map(field => ({
      field,
      from: kind === 'update' ? current?.[field.id] ?? '' : '',
      to: restored[field.id]
    }))
}

/**
 * Whether the log row can be reverted right now, and what it would change. Reads only. Called
 * for the preview and again right before the write, because the record may change while the
 * question is on screen.
 */
export async function planRecordRevert(
  spreadsheetId: string,
  entry: TrailEntry
): Promise<RevertPreview> {
  const found = revertKindOf(entry)

  if (!found) return { ok: false, reason: 'این ردیف قابل بازگردانی نیست.' }
  if (!isPersonalWorkspace(spreadsheetId)) return { ok: false, reason: NOT_HERE }

  const { kind, trail } = found
  const form = (getSettings()?.forms ?? []).find(item => item.id === trail.formId)

  if (!form || (form.type !== 'income' && form.type !== 'expense')) {
    return { ok: false, reason: 'فرم این تراکنش دیگر در برنامه نیست.' }
  }

  const log = await fetchActivityLog(spreadsheetId, LOG_READ_LIMIT, 0)
  const reverted = doneHere.has(entry.id) || revertedLogIds(log).has(entry.id)
  const stored = (await fetchRecords(spreadsheetId, form)).find(item => item.id === entry.itemId)
  const record = stored ? enrichRecord(stored, form) : null
  const verdict = checkRevert(kind, trail, form, record?.values ?? null, reverted)

  if (!verdict.ok) return verdict

  // What the record would look like after the revert, for a delete the record itself.
  const after = kind === 'update' ? { ...record?.values, ...trail.before } : trail.before

  if ((record && isSpecial(record.values)) || isSpecial(after)) {
    return { ok: false, reason: SPECIAL }
  }

  return {
    ok: true,
    plan: {
      entry,
      kind,
      form,
      trail,
      record,
      changes: changesOf(form, kind, trail, record?.values ?? null)
    }
  }
}

async function recreate(spreadsheetId: string, plan: RevertPlan): Promise<boolean> {
  const values: Record<string, string> = {}

  for (const field of plan.form.fields) values[field.id] = plan.trail.before[field.id] ?? ''

  const recordId = await writeEntryRecord(
    spreadsheetId,
    plan.form,
    values,
    null,
    undefined,
    plan.entry.id
  )

  doneHere.add(plan.entry.id)
  await settleSavedEntry(spreadsheetId, plan.form, values, undefined, recordId)
  showSuccess('تراکنش دوباره ساخته شد')

  return true
}

/**
 * Reverts one log row through the app's normal paths: an edit is saved again with the old values
 * (`submitRecordEdit`: wallet balance and «گردش حساب», linked check / instalment / debt payments),
 * a delete is entered again (`writeEntryRecord` + `settleSavedEntry`). Either logs a NEW
 * «بازگردانی شد» row; the old row is never touched. A row is reverted once: a second tap while the
 * first runs, or after it finished, does nothing.
 */
export async function runRecordRevert(
  spreadsheetId: string,
  entry: TrailEntry
): Promise<RevertResult> {
  if (running.has(entry.id)) return { status: 'busy' }
  running.add(entry.id)

  try {
    const preview = await planRecordRevert(spreadsheetId, entry)

    if (!preview.ok) return { status: 'refused', reason: preview.reason }

    const { plan } = preview
    let ok: boolean

    if (plan.kind === 'delete') {
      ok = await recreate(spreadsheetId, plan)
    } else {
      ok = await submitRecordEdit({
        editingRecord: plan.record!,
        editingForm: plan.form,
        formValues: { ...plan.record!.values, ...plan.trail.before },
        revertOf: entry.id,
        onSuccess: async () => undefined
      })
    }
    if (ok) {
      doneHere.add(entry.id)
      // The «بازگردانی شد» row is in the feed's data before the caller refreshes it.
      await activityLogSettled()
    }

    return ok ? { status: 'done' } : { status: 'failed' }
  } catch {
    return { status: 'failed' }
  } finally {
    running.delete(entry.id)
  }
}

/** Test hook: forget this session's reverted rows. */
export function resetRevertSession(): void {
  running.clear()
  doneHere.clear()
}
