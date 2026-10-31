import { Capacitor } from '@capacitor/core'

import {
  recordActivityTitle,
  summaryFor,
  type ActivityAction,
  type ActivitySummaryExtra
} from './activityLogText'
import { deleteTrail, editTrail, revertMarkTrail } from './activityTrail'
import { NO_TRAIL, type TrailCells } from './activityTrailModel'
import { getUserEmail, getUserName } from './auth'
import { ACTIVITY_LOG_HEADERS } from './sheetHeaders'
import { ACTIVITY_LOG_SHEET } from './sheetNames'
import { isSheetPrepared } from './sheetsMeta'
import { getSheetAllRows } from './spreadsheetStore'
import { isPersonalWorkspace } from './workspace'
import type { CustomForm } from '../types'
import { activityDeviceLabel } from '../utils/deviceLabel'
import { cellToString } from '../utils/sheetValues'

export type { ActivityAction } from './activityLogText'

export interface ActivityEntry {
  id: string
  /** ISO time of the change. */
  at: string
  email: string
  name: string
  action: ActivityAction
  /** `ActivityModule` id; kept a string so a newer app's modules still read. */
  module: string
  itemId: string
  summary: string
  device: string
  /** «ردپا» (`activityTrail.ts`): '' on a row without one. */
  before: string
  after: string
  version: string
}

export type ActivityInput = Omit<
  ActivityEntry,
  'id' | 'at' | 'email' | 'name' | 'device' | keyof TrailCells
> &
  Partial<TrailCells>

const WRITE_OPTIONS = { skipActivity: true, skipRevision: true } as const

export function deviceLabel(): string {
  return activityDeviceLabel(Capacitor.isNativePlatform())
}

/** One sheet row, in `ACTIVITY_LOG_HEADERS` order. */
export function activityToRow(entry: ActivityEntry): string[] {
  return [
    entry.id,
    entry.at,
    entry.email,
    entry.name,
    entry.action,
    entry.module,
    entry.itemId,
    entry.summary,
    entry.device,
    entry.before,
    entry.after,
    entry.version
  ]
}

export function rowToActivity(row: readonly unknown[]): ActivityEntry | null {
  const cell = (index: number) => cellToString(row[index]).trim()

  if (!cell(0) || !cell(1)) return null

  return {
    id: cell(0),
    at: cell(1),
    email: cell(2).toLowerCase(),
    name: cell(3),
    action: cell(4) as ActivityAction,
    module: cell(5),
    itemId: cell(6),
    summary: cell(7),
    device: cell(8),
    // A row from before the trail columns (or written by an older app) is shorter: empty cells.
    before: cell(9),
    after: cell(10),
    version: cell(11)
  }
}

/** The row for `input`, or null when signed out. */
export function buildActivityEntry(input: ActivityInput, now = new Date()): ActivityEntry | null {
  const email = getUserEmail()

  if (!email) return null

  return {
    id: crypto.randomUUID(),
    at: now.toISOString(),
    email: email.trim().toLowerCase(),
    name: getUserName() ?? '',
    device: deviceLabel(),
    ...NO_TRAIL,
    ...input
  }
}

function tabReady(spreadsheetId: string): boolean {
  const header = getSheetAllRows(spreadsheetId, ACTIVITY_LOG_SHEET)?.[0]

  return (
    Boolean(header?.some(cell => String(cell ?? '').trim())) ||
    isSheetPrepared(spreadsheetId, ACTIVITY_LOG_SHEET)
  )
}

async function append(spreadsheetId: string, row: string[]): Promise<void> {
  const { appendSheetRow, ensureSheetWithHeaders } = await import('./sheets')

  // A missing tab would park the append as a failed write; create it first.
  if (!tabReady(spreadsheetId)) {
    await ensureSheetWithHeaders(spreadsheetId, ACTIVITY_LOG_SHEET, ACTIVITY_LOG_HEADERS)
  }
  await appendSheetRow(spreadsheetId, ACTIVITY_LOG_SHEET, row, WRITE_OPTIONS)
}

/** Log rows queued but not yet in the local mirror. */
const pendingWrites = new Set<Promise<void>>()

/** Resolves once every log row queued so far is in the mirror (a caller that refreshes the feed). */
export async function activityLogSettled(): Promise<void> {
  await Promise.all([...pendingWrites])
}

/**
 * Queues one «فعالیت_ها» row right after the user-initiated write it
 * describes. Never throws and never blocks the caller; signed out, it does
 * nothing. Sync pulls, archive sweeps, seeding and backups never call it.
 */
export function logActivity(spreadsheetId: string, input: ActivityInput): void {
  try {
    const entry = spreadsheetId ? buildActivityEntry(input) : null

    if (!entry) return

    const write = append(spreadsheetId, activityToRow(entry)).catch(() => undefined)

    pendingWrites.add(write)
    void write.then(() => pendingWrites.delete(write))
  } catch {
    // The feed is best effort; the change itself already went out.
  }
}

/** `logActivity` with the summary built from `summaryFor` (the usual case). */
export function logItemActivity(
  spreadsheetId: string,
  action: ActivityAction,
  module: string,
  itemId: string,
  title: string,
  extra?: ActivitySummaryExtra
): void {
  logActivity(spreadsheetId, {
    action,
    module,
    itemId,
    summary: summaryFor(action, module, title, extra)
  })
}

/** What a record's log row needs beyond its values to carry a «ردپا». */
export interface RecordTrailInput {
  form: CustomForm
  /** The record as it was stored before an edit (or before the revert of one). */
  before?: Record<string, unknown>
  /** On a «بازگردانی شد» row: the id of the log row it reverted. */
  revertOf?: string
}

/** The trail of one record change; only a personal spreadsheet keeps one (its pages revert). */
function recordTrailCells(
  spreadsheetId: string,
  action: ActivityAction,
  values: Record<string, unknown>,
  { form, before, revertOf }: RecordTrailInput
): TrailCells {
  if (!isPersonalWorkspace(spreadsheetId)) return NO_TRAIL
  if (action === 'delete') return deleteTrail(form, values)
  if (action === 'update' && before) return editTrail(form, before, values)
  if (action !== 'revert' || !revertOf) return NO_TRAIL

  return before ? editTrail(form, before, values, revertOf) : revertMarkTrail(form, revertOf)
}

/**
 * A record created, edited, deleted or reverted by hand; named by its title or category.
 * `extra.change` puts an edited amount's «از X به Y» into the line. With `trail`, an edit or a
 * delete also stores what it changed, so the activity page can show «قبل → بعد» and revert it.
 */
export function logRecordActivity(
  spreadsheetId: string,
  action: 'create' | 'update' | 'delete' | 'revert',
  recordId: string,
  values: Record<string, unknown>,
  extra?: ActivitySummaryExtra,
  trail?: RecordTrailInput
): void {
  logActivity(spreadsheetId, {
    action,
    module: 'records',
    itemId: recordId,
    summary: summaryFor(action, 'records', recordActivityTitle(values), extra),
    ...(trail ? recordTrailCells(spreadsheetId, action, values, trail) : NO_TRAIL)
  })
}

/** Newest first, from the local mirror (the log tab plus loaded yearly archives). */
export async function fetchActivityLog(
  spreadsheetId: string,
  limit: number,
  offset: number
): Promise<ActivityEntry[]> {
  const rows = getSheetAllRows(spreadsheetId, ACTIVITY_LOG_SHEET) ?? []

  return rows
    .slice(1)
    .map(rowToActivity)
    .filter((entry): entry is ActivityEntry => entry !== null)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(offset, offset + limit)
}

export { ACTIVITY_LOG_KEEP } from './activityLogSweep'

/** Moves the oldest rows past `ACTIVITY_LOG_KEEP` into yearly archives (also run after a pull). */
export async function sweepActivityLog(spreadsheetId: string): Promise<void> {
  const { sweepActivityLogArchives } = await import('./recordArchiveSweep')
  const { withOutboxLock } = await import('./sheetSyncOutbox')

  await withOutboxLock(spreadsheetId, () => sweepActivityLogArchives(spreadsheetId))
}
