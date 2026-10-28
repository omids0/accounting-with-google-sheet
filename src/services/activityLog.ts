import { Capacitor } from '@capacitor/core'

import {
  recordActivityTitle,
  summaryFor,
  type ActivityAction,
  type ActivitySummaryExtra
} from './activityLogText'
import { getUserEmail, getUserName } from './auth'
import { ACTIVITY_LOG_HEADERS } from './sheetHeaders'
import { ACTIVITY_LOG_SHEET } from './sheetNames'
import { isSheetPrepared } from './sheetsMeta'
import { getSheetAllRows } from './spreadsheetStore'
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
}

export type ActivityInput = Omit<ActivityEntry, 'id' | 'at' | 'email' | 'name' | 'device'>

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
    entry.device
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
    device: cell(8)
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

/**
 * Queues one «فعالیت_ها» row right after the user-initiated write it
 * describes. Never throws and never blocks the caller; signed out, it does
 * nothing. Sync pulls, archive sweeps, seeding and backups never call it.
 */
export function logActivity(spreadsheetId: string, input: ActivityInput): void {
  try {
    const entry = spreadsheetId ? buildActivityEntry(input) : null

    if (!entry) return
    void append(spreadsheetId, activityToRow(entry)).catch(() => undefined)
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

/**
 * A record created, edited or deleted by hand; named by its title or category. `extra.change`
 * puts an edited amount's «از X به Y» into the line.
 */
export function logRecordActivity(
  spreadsheetId: string,
  action: 'create' | 'update' | 'delete',
  recordId: string,
  values: Record<string, unknown>,
  extra?: ActivitySummaryExtra
): void {
  logItemActivity(spreadsheetId, action, 'records', recordId, recordActivityTitle(values), extra)
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
